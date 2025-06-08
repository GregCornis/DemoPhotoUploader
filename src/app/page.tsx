'use client'

const { Jimp } = require("jimp");
import { Tensor } from 'onnxruntime-web';
import * as ort from 'onnxruntime-web';
import { useState, useEffect } from "react";


class UploadData {
  name: string;
  files: [File];
  percent: number;
  analysis?: [Analysis]

  constructor(name: string, files: [File], percent: number, analysis?: [Analysis]) {
    this.name = name;
    this.files = files;
    this.percent = percent;
    this.analysis = analysis;
  }

  static new(campaign: string, files: [File]): UploadData {
    return new UploadData(
      Temporal.Now.instant().toString() + "_" + campaign,
      files,
      100
    );
  }

  get number_pictures(): number {
    return this.files.length;
  }

  updateAnalysis(analysis: [Analysis]): UploadData {
    return new UploadData(this.name, this.files, this.percent, analysis);
  }
}

class Analysis {
  file: File;
  overExposed: Boolean;
  underExposed: Boolean;

  constructor(file: File, overExposed: Boolean, underExposed: Boolean) {
    this.file = file;
    this.overExposed = overExposed;
    this.underExposed = underExposed;
  }
}

export default function Home() {
  const [mask, setMask] = useState(undefined);
  const [uploads, setUploads] = useState([]);
  const [showNewUpload, setShowNewUpload] = useState(false);

  let uploadsView = uploads.map((u) => {
    return <UploadRow upload={u}/>;
  });
  if (!uploads.length) {
    uploadsView = <em>No uploads yet</em>;
  }

  return (
    <div className='main'>

      <div className='top'>
        <h1 className='grow'>My uploads</h1>
        <button className='new' onClick={() => setShowNewUpload(true)}>+ New</button>


        {showNewUpload ? 
        <NewUpload 
          setNewUpload={(up) => {
            console.log("New upload", up);
            setUploads(uploads.concat([up]));
            setShowNewUpload(false);
            runAnalysis(up.files, () => {}, 
            (res) => {
              const newUp = up.updateAnalysis(res);
              console.log("Setting uploads", newUp)
              setUploads([newUp]);  // TODO only one in list
            })
          }} 
          cancel={() => setShowNewUpload(false)}/> 
          : <></>}
      </div>

      {uploadsView}
    </div>
  );
}

function UploadRow({upload}: {upload: UploadData}) {
  return <div className='upload-row flex flex-col'>
    <div className='flex flex-row items-center w-full'>
      <div className='title'>{upload.name}</div>
      <div className='pic'>{upload.number_pictures} pictures</div>
      <LoadingBar percent={upload.percent}/>
    </div>
    {
      true ? <AnalysisPreview files={upload.files} analysis={upload.analysis || []} /> : <></>
    }
  </div>
}

function LoadingBar({percent}) {
  return  <div className='flex flex-row items-center grow'>
            <div className='loading-bar'>
              <div className='done' style={{width: percent + '%'}} />
            </div>
            <div className='m-2' >{percent} %</div>
          </div>
}

function AnalysisPreview({files, analysis}) {
  console.log("Repainting analysis", analysis);

  const nPictures = files.length;
  const overExposed = analysis.filter((x) => x.overExposed).length;
  const underExposed = analysis.filter((x) => x.underExposed).length;
  const ok = analysis.filter((x) => !x.overExposed && !x.underExposed).length;
  const analyzing = nPictures - analysis.length;
  
  return <div className='preview'>
    <div className='tags'>
      <div className='tag all'>{nPictures} <b>All</b></div>
      <div className='tag okey'>{ok} <b>Ok</b></div>
      <div className='tag under-exposed'>{underExposed} <b>Under-exposed</b></div>
      <div className='tag over-exposed'>{overExposed} <b>Over-exposed</b></div>
      <div className='tag analyzing'>{analyzing} <b>Analysing..</b></div>
    </div>
    <PreviewFolder files={files} analysisResults={analysis} />
  </div>
}

function PreviewImage({file, analysis}) {

  let c;
  if (analysis == undefined) {
    c = "";
  } else {
    if (analysis.overExposed) { c = "overExposed"; }
    else if (analysis.underExposed) { c = "underExposed"}
    else { c = "ok"; }
  }

  return  <li key={file.webkitRelativePath} className="imgPreview">
            <img src={URL.createObjectURL(file)} loading="lazy" title={file.name} />
            <div className={c}>{c}</div>
          </li>
}

function PreviewFolder({ files, analysisResults }) {
  const filesDesc = [...files]
    .toSorted()
    .map((f) => {
    if (f.name.endsWith("jpg") || f.name.endsWith("JPG")) {

      const analysis = analysisResults.find((a) => a.file == f);

      return <PreviewImage key={f.webkitRelativePath} file={f} analysis={analysis}/>
    }
    return <li> {f.size}B <em>{f.webkitRelativePath}</em> </li>
  });
  return <div className="imagesGrid">{filesDesc}</div>
}

function Upload({ setFiles }) {

  function selectedFolder(event) {
    console.log("Selected");
    console.log(event);
    setFiles([...event.target.files].filter((f) => f.name.endsWith("jpg") || f.name.endsWith("JPG")));
  }


  return (<>

    <input
      className="upload"
      directory=""
      webkitdirectory=""
      type="file"
      onChange={selectedFolder}
    />
  </>
  )
}


function Loader({show}) {
  if (show) {
    return <div className="loader" />
  }
  return <></>
}

function AnalysisResults({analysisResults}) {
  const overExposed = analysisResults.filter((x) => x.overExposed).length;
  const underExposed = analysisResults.filter((x) => x.underExposed).length;
  const ok = analysisResults.filter((x) => !x.overExposed && !x.underExposed).length;
  return <li>
    <ol>Over exposed: {overExposed} / {analysisResults.length}</ol>
    <ol>Under exposed: {underExposed} / {analysisResults.length}</ol>
    <ol>OK: {ok} / {analysisResults.length}</ol>
  </li>;
}

function NewUpload({setNewUpload, cancel}) {
  const [files, setFiles] = useState([]);
  const [name, setName] = useState("");

  return <div className="floating">
    
    <label className='flex flex-row items-baseline'>
      Campaign name
      <input className='bg-white m-2' value={name} onChange={(e) => setName(e.target.value)} />
    </label>

    <div className='flex flex-row'>
      <Upload setFiles={setFiles}/>
    </div>
    <button className='cancel' onClick={cancel}>Cancel</button>
    <button className='validate' onClick={() => {setNewUpload(UploadData.new(name, files))}} >Validate</button>
  </div>
}


//  =============================================================================

async function runAnalysis(files, setMask, setAnalysisResults) {
  console.log("Running analysis on ", files[0]);

  let analysisResults = [];

  const session = await ort.InferenceSession
                          .create('/segmentation.onnx',
                          { executionProviders: ['wasm'], graphOptimizationLevel: 'all' });
  console.log('Inference session created');
  

  for (const file of files) {
    const {resized, mask} = await runSegmentation(URL.createObjectURL(file), session);
    
    const b64 = await mask.getBase64("image/jpeg");
    setMask(b64);
    
    const analysis = analysePicture(resized, mask);
    analysisResults = analysisResults.concat([new Analysis(file, analysis.overExposed, analysis.underExposed)]);
    setAnalysisResults(analysisResults);
    console.log("results", analysisResults);
  }
}


async function runSegmentation(path: string, session: ort.InferenceSession) {
  const {resized, imageTensor: tensor} = await getImageTensorFromPath(path);
  console.log("Tensor", tensor);

  // Run inference and get results.
  var results =  await runInference(session, tensor);
  console.log("Successfully run inference");

  const mask = createMask(resized, results);
  console.log("Mask:", mask);
  return {resized, mask};
}

export async function getImageTensorFromPath(path: string, dims: number[] =  [1, 3, 512, 512]) {
  const image = await Jimp.read(path, { 'image/jpeg': { maxMemoryUsageInMB: 1024 } });
  const resized = image.resize({w: 512, h: 512});
  console.log("Read image successfully");

  const imageTensor = imageDataToTensor(resized, dims);
  console.log("Tensor OK");
  return {resized, imageTensor};
}

function imageDataToTensor(image: Jimp, dims: number[]): Tensor {
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

async function runInference(session: ort.InferenceSession, preprocessedData: any): Promise<any> {
  const start = new Date();
  const feeds: Record<string, ort.Tensor> = {};
  feeds[session.inputNames[0]] = preprocessedData;
  
  const outputData = await session.run(feeds);
  const end = new Date();
  const inferenceTime = (end.getTime() - start.getTime())/1000;
  
  const output = outputData[session.outputNames[0]];
  
  console.log('results: ', inferenceTime, output);
  return output;
}

function createMask(resizedImg: Jimp, output: Tensor) {
  const width = output.dims[2];
  const height = output.dims[3];

  console.log("Creating mask of", output.dims);

  const imageData = Buffer.alloc(width * height);
  const outputImg = new Jimp({width, height, color: '#000000FF'});

  for (let row=0; row < height; row++) {
    for (let col=0; col < width; col++) {
      const index = row * width + col;
      // imageData[index] = Math.round(output.data[index]);
      outputImg.bitmap.data[4*index] = output.data[index] < output.data[index + width * height] + 0.9 ? resizedImg.bitmap.data[4*index] : 0;
      outputImg.bitmap.data[4*index + 1] = output.data[index] < output.data[index + width * height] + 0.9 ? resizedImg.bitmap.data[4*index + 1] : 0;
      outputImg.bitmap.data[4*index + 2] = output.data[index] < output.data[index + width * height] + 0.9 ? resizedImg.bitmap.data[4*index + 2] : 0;
    }
  }

  console.log("Buffer", outputImg);

  return outputImg;
}

const OVEREXPOSED_THRESHOLD = 210;
const UNDEREXPOSED_THRESHOLD = 70;

function analysePicture(resizedPicture, mask) {
  console.log("Running analysis");
  var count = 0;
  var overExposed = 0;
  var underExposed = 0;
  for (let row=0; row < 512; row++) {
    for (let col=0; col < 512; col++) {
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
  if (bladeProportion < 0.01) return {underExposed: false, overExposed: false};
  const isOverExposed = overExposed > count / 4;
  const isUnderExposed = underExposed > count / 4;
  return {overExposed: isOverExposed, underExposed: isUnderExposed};
}


