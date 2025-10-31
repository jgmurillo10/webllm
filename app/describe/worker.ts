import {
  AutoProcessor,
  AutoModelForVision2Seq,
  TextStreamer,
  InterruptableStoppingCriteria,
  RawImage,
  type Processor,
  type PreTrainedModel,
} from "@huggingface/transformers";

const MAX_NEW_TOKENS = 1024;

let fp16_supported = false;

async function check() {
  try {
    const adapter = await (navigator as any).gpu?.requestAdapter();
    if (!adapter) {
      throw new Error("WebGPU is not supported (no adapter found)");
    }
    fp16_supported = adapter.features.has("shader-f16");
    self.postMessage({ status: "checked", fp16_supported });
  } catch (e) {
    self.postMessage({
      status: "error",
      data: String(e),
    });
  }
}

class SmolVLM {
  static model_id = "HuggingFaceTB/SmolVLM-256M-Instruct";
  static processor: Processor | null = null;
  static model: PreTrainedModel | null = null;

  static async getInstance(progress_callback: any = undefined) {
    this.processor ??= await AutoProcessor.from_pretrained(this.model_id, {
      progress_callback,
    });

    this.model ??= await AutoModelForVision2Seq.from_pretrained(this.model_id, {
      dtype: fp16_supported ? "fp16" : "fp32",
      device: "webgpu",
      progress_callback,
    });

    return [this.processor, this.model] as const;
  }
}

const stopping_criteria = new InterruptableStoppingCriteria();

interface MessageContent {
  type: "text" | "image";
  text?: string;
  image?: string;
}

interface Message {
  role: "user" | "assistant";
  content: MessageContent[];
}

async function generate(messages: Message[]) {
  // For this demo, we only respond to the last message
  const lastMessage = messages.slice(-1);

  // Retrieve the model and processor
  const [processor, model] = await SmolVLM.getInstance();

  // Load all images from the messages
  const imageContents = lastMessage
    .flatMap((x) => x.content)
    .filter(
      (msg): msg is MessageContent & { type: "image" } =>
        msg.type === "image" && !!msg.image
    );

  // Ensure we have at least one image
  if (imageContents.length === 0) {
    throw new Error("No image provided");
  }

  const images = await Promise.all(
    imageContents.map((msg) => RawImage.read(msg.image!))
  );

  // Extract text from the message
  const textContent = lastMessage
    .flatMap((x) => x.content)
    .filter((c) => c.type === "text")
    .map((c) => c.text || "")
    .join(" ");

  // For SmolVLM, we need to format as conversation messages
  const text = textContent || "Describe this image in detail.";

  // Apply chat template to format the prompt correctly
  const prompt = processor.apply_chat_template(
    [
      {
        role: "user",
        content: [{ type: "image" }, { type: "text", text }],
      },
    ],
    { add_generation_prompt: true, tokenize: false }
  );

  // Process the inputs with the formatted prompt and images array
  // Note: processor expects (text, images) - text first, images second
  const inputs = await processor(prompt, images);

  let startTime: number | undefined;
  let numTokens = 0;
  let tps: number | undefined;

  const token_callback_function = () => {
    startTime ??= performance.now();
    if (numTokens++ > 0) {
      tps = (numTokens / (performance.now() - startTime)) * 1000;
    }
  };

  const callback_function = (output: string) => {
    self.postMessage({
      status: "update",
      output,
      tps,
      numTokens,
    });
  };

  const streamer = new TextStreamer(processor.tokenizer!, {
    skip_prompt: true,
    skip_special_tokens: true,
    callback_function,
    token_callback_function,
  });

  // Tell the main thread we are starting
  self.postMessage({ status: "start" });

  try {
    const outputs = await model.generate({
      ...inputs,
      do_sample: false,
      max_new_tokens: MAX_NEW_TOKENS,
      repetition_penalty: 1.1,
      streamer,
      stopping_criteria,
    });

    const decoded = processor.batch_decode(
      Array.isArray(outputs) ? outputs : [outputs],
      {
        skip_special_tokens: true,
      }
    );

    // Send the output back to the main thread
    self.postMessage({
      status: "complete",
      output: decoded,
    });
  } catch (e: any) {
    self.postMessage({
      status: "error",
      data: String(e),
    });
  }
}

async function load() {
  self.postMessage({
    status: "loading",
    data: "Loading SmolVLM model...",
  });

  try {
    // Load the model and save it for future use
    await SmolVLM.getInstance((data: any) => {
      // Track model loading progress
      self.postMessage(data);
    });

    self.postMessage({ status: "ready" });
  } catch (e: any) {
    self.postMessage({
      status: "error",
      data: String(e),
    });
  }
}

// Listen for messages from the main thread
self.addEventListener("message", async (e) => {
  const { type, data } = e.data;

  switch (type) {
    case "check":
      check();
      break;
    case "load":
      load();
      break;
    case "generate":
      stopping_criteria.reset();
      generate(data);
      break;
    case "interrupt":
      stopping_criteria.interrupt();
      break;
    case "reset":
      stopping_criteria.reset();
      break;
  }
});
