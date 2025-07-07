import { Tensor } from 'onnxruntime-web';
import * as ort from 'onnxruntime-web';
import { Jimp, JimpInstance } from "jimp";
import { Analysis } from "./utils";

self.onmessage = async (e) => {
  console.log("Analyser received", e.data);
  console.log("Path", location.hostname, location.host, location.href, self.location.origin);
  ort.env.wasm.wasmPaths = `${self.location.origin}/`; //{wasm: "ort-wasm-simd-threaded.jsep.8296b855.wasm"};
  
  await runAnalysis(e.data, () => {}, (analysis) => { postMessage(analysis) });
}

export async function runAnalysis(files: File[], setMask: (m: any) => void, setAnalysisResults: (m: Analysis[]) => void) {
  console.log("Running analysis on ", files[0]);

  let analysisResults: Analysis[] = [];

  const session = await ort.InferenceSession.create(`${self.location.origin}/segmentation.onnx`, { graphOptimizationLevel: 'all' });
  console.log('Inference session created');

  for (const file of files) {
    const { resized, mask } = await runSegmentation(URL.createObjectURL(file), session);

    const b64 = await mask.getBase64("image/jpeg");
    setMask(b64);

    const analysis = analysePicture(resized, mask);
    analysisResults = analysisResults.concat([new Analysis(file, analysis.overExposed, analysis.underExposed)]);
    setAnalysisResults(analysisResults);
    console.log("results", analysisResults);
  }
}


async function runSegmentation(path: string, session: ort.InferenceSession): Promise<{resized: any, mask: any}> {
  const { resized, imageTensor: tensor }: {resized: JimpInstance, imageTensor: Tensor} = await getImageTensorFromPath(path);
  console.log("Tensor", tensor);

  // Run inference and get results.
  var results = await runInference(session, tensor);
  console.log("Successfully run inference");

  const mask = createMask(resized, results);
  console.log("Mask:", mask);
  return { resized, mask };
}

async function getImageTensorFromPath(path: string, dims: number[] = [1, 3, 512, 512]): Promise<{resized: any, imageTensor: any}> {
  const image = await Jimp.read(path, { 'image/jpeg': { maxMemoryUsageInMB: 1024 } });
  const resized = image.resize({ w: 512, h: 512 });
  console.log("Read image successfully");

  const imageTensor = imageDataToTensor(resized, dims);
  console.log("Tensor OK");
  return { resized, imageTensor };
}

function imageDataToTensor(image: any, dims: number[]): Tensor {
  // 1. Get buffer data from image and create R, G, and B arrays.
  var imageBufferData = image.bitmap.data;
  const [redArray, greenArray, blueArray] = new Array(new Array<number>(), new Array<number>(), new Array<number>());

  // 2. Loop through the image buffer and extract the R, G, and B channels
  for (let i = 0; i < imageBufferData.length; i += 4) {
    redArray.push(imageBufferData[i]);
    greenArray.push(imageBufferData[i + 1]);
    blueArray.push(imageBufferData[i + 2]);
    // skip data[i + 3] to filter out the alpha channel
  }

  // 3. Concatenate RGB to transpose [224, 224, 3] -> [3, 224, 224] to a number array
  const transposedData = redArray.concat(greenArray).concat(blueArray);

  // 4. convert to float32
  let i, l = transposedData.length; // length, we need this for the loop
  // create the Float32Array size 3 * 224 * 224 for these dimensions output
  const float32Data = new Float32Array(dims[1] * dims[2] * dims[3]);
  for (i = 0; i < l; i++) {
    float32Data[i] = transposedData[i];
  }
  // 5. create the tensor object from onnxruntime-web.
  const inputTensor = new Tensor("float32", float32Data, dims);
  return inputTensor;
}

async function runInference(session: ort.InferenceSession, preprocessedData: any): Promise<Tensor> {
  const start = new Date();
  const feeds: Record<string, ort.Tensor> = {};
  feeds[session.inputNames[0]] = preprocessedData;

  const outputData = await session.run(feeds);
  const end = new Date();
  const inferenceTime = (end.getTime() - start.getTime()) / 1000;

  const output = outputData[session.outputNames[0]];

  console.log('results: ', inferenceTime, output);
  return output;
}

function createMask(resizedImg: JimpInstance, output: Tensor) {
  const width = output.dims[2];
  const height = output.dims[3];

  console.log("Creating mask of", output.dims);

  const imageData = Buffer.alloc(width * height);
  const outputImg = new Jimp({ width, height, color: '#000000FF' });

  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const index = row * width + col;
      // imageData[index] = Math.round(output.data[index]);
      outputImg.bitmap.data[4 * index] = output.data[index] < output.data[index + width * height] + 0.9 ? resizedImg.bitmap.data[4 * index] : 0;
      outputImg.bitmap.data[4 * index + 1] = output.data[index] < output.data[index + width * height] + 0.9 ? resizedImg.bitmap.data[4 * index + 1] : 0;
      outputImg.bitmap.data[4 * index + 2] = output.data[index] < output.data[index + width * height] + 0.9 ? resizedImg.bitmap.data[4 * index + 2] : 0;
    }
  }

  console.log("Buffer", outputImg);

  return outputImg;
}

const OVEREXPOSED_THRESHOLD = 210;
const UNDEREXPOSED_THRESHOLD = 70;

function analysePicture(resizedPicture: JimpInstance, mask: JimpInstance) {
  console.log("Running analysis");
  var count = 0;
  var overExposed = 0;
  var underExposed = 0;
  for (let row = 0; row < 512; row++) {
    for (let col = 0; col < 512; col++) {
      const index = row * 512 + col;
      if (mask.bitmap.data[4 * index] > 0) {
        count += 1;
        const red = resizedPicture.bitmap.data[4 * index];
        const green = resizedPicture.bitmap.data[4 * index + 1];
        const blue = resizedPicture.bitmap.data[4 * index + 2];
        const pixelValue = Math.max(red, green, blue);  // Take max instead of grey for colored blades
        if (pixelValue > OVEREXPOSED_THRESHOLD) { overExposed += 1; }
        if (pixelValue < UNDEREXPOSED_THRESHOLD) { underExposed += 1; }
      }
    }
  }
  const bladeProportion = count / (512 * 512);
  console.log("Analysis", count, overExposed, underExposed);
  if (bladeProportion < 0.01) return { underExposed: false, overExposed: false };
  const isOverExposed = overExposed > count / 4;
  const isUnderExposed = underExposed > count / 4;
  return { overExposed: isOverExposed, underExposed: isUnderExposed };
}


