'use client'

import { useState, useEffect, ReactNode, useMemo } from "react";
import { Analysis, UploadData } from './utils'
import { runAnalysis } from './analyser'


export default function Home() {
  const [mask, setMask] = useState(undefined);
  const [uploads, setUploads] = useState<UploadData[]>([]);
  const [showNewUpload, setShowNewUpload] = useState(false);
  const [filters, setFilters] = useState({ ok: true, overExposed: true, underExposed: true, analyzing: true });

  const uploader: Worker = useMemo(
    () => new Worker(new URL("uploader.ts", import.meta.url)),
    []
  );

  uploader.onmessage = (e) => {
    console.log("Receive message from worker", e.data);

    setUploads([uploads[0].updateProgress(e.data)]);

  };

  let uploadsView: ReactNode = uploads.map((u) => {
    return <UploadRow upload={u} filters={filters} setFilters={setFilters} />;
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
            setNewUpload={(up: UploadData) => {
              console.log("New upload", up);
              uploader.postMessage(up.files);

              setUploads(uploads.concat([up]));
              setShowNewUpload(false);
              runAnalysis(up.files, () => { },
                (res) => {
                  const newUp = uploads[0].updateAnalysis(res);
                  console.log("Setting uploads", newUp)
                  setUploads([newUp]);  // TODO only one in list
                })
            }}
            cancel={() => setShowNewUpload(false)} />
          : <></>}
      </div>

      {uploadsView}
    </div>
  );
}

function UploadRow({ upload, filters, setFilters }: { upload: UploadData, filters: any, setFilters: () => void }) {
  return <div className='upload-row flex flex-col'>
    <div className='flex flex-row items-center w-full'>
      <div className='title'>{upload.name}</div>
      <div className='pic'>{upload.number_pictures} pictures</div>
      <LoadingBar percent={upload.percent} />
    </div>
    {
      true ? <AnalysisPreview files={upload.files} analysis={upload.analysis || []} filters={filters} setFilters={setFilters} /> : <></>
    }
  </div>
}

function LoadingBar({ percent }: {percent: number}) {
  return <div className='flex flex-row items-center grow'>
    <div className='loading-bar'>
      <div className='done' style={{ width: percent + '%' }} />
    </div>
    <div className='m-2' >{Math.round(percent)} %</div>
  </div>
}

function Tag({ name, number, onClick, enabled }: { name: string, number: number, onClick: () => void, enabled: Boolean }) {
  const enabledClass = enabled ? '' : 'disabled';
  return <div
    className={'tag ' + name + ' ' + enabledClass}
    onClick={onClick}>
    {number} <b>{name}</b>
  </div>
}

function AnalysisPreview({ files, analysis, filters, setFilters }: { files: File[], analysis: Analysis[], filters: any, setFilters: (f: any) => void }) {
  console.log("Repainting analysis", analysis);

  const nPictures = files.length;
  const overExposed = analysis.filter((x) => x.overExposed).length;
  const underExposed = analysis.filter((x) => x.underExposed).length;
  const ok = analysis.filter((x) => !x.overExposed && !x.underExposed).length;
  const analyzing = nPictures - analysis.length;

  const filesToShow = files.filter((file) => {
    const a = analysis?.find((a) => a.file == file);
    if (a == undefined && filters.analyzing) return true;
    if (a?.overExposed && filters.overExposed) return true;
    if (a?.underExposed && filters.underExposed) return true;
    if (a?.ok && filters.ok) return true;
    return false;
  });

  return <div className='preview'>
    <div className='tags'>
      <div className='tag all'>{nPictures} <b>All</b></div>
      
      <Tag name='okey' number={ok} onClick={() => {
        console.log("Toggling ok tag");
        setFilters({ ...filters, ok: !filters.ok });
      }} enabled={filters.ok} />
      <Tag 
          name='under-exposed' 
          number={underExposed} 
          onClick={() => {
            console.log("Toggling under-exposed tag");
            setFilters({ ...filters, underExposed: !filters.underExposed });
          }} 
          enabled={filters.underExposed} />
      <Tag 
          name='over-exposed' 
          number={overExposed} 
          onClick={() => setFilters({ ...filters, overExposed: !filters.overExposed })} 
          enabled={filters.overExposed} />
      <Tag 
          name='analyzing' 
          number={analyzing} 
          onClick={() => setFilters({ ...filters, analyzing: !filters.analyzing })} 
          enabled={filters.analyzing} />

    </div>
    <PreviewFolder files={filesToShow} analysisResults={analysis} />
  </div>
}

function PreviewImage({ file, analysis }) {

  let c;
  if (analysis == undefined) {
    c = "";
  } else {
    if (analysis.overExposed) { c = "overExposed"; }
    else if (analysis.underExposed) { c = "underExposed" }
    else { c = "ok"; }
  }

  return <li key={file.webkitRelativePath} className="imgPreview">
    <img src={URL.createObjectURL(file)} loading="lazy" title={file.name} />
    <div className={c}>{c}</div>
  </li>
}

function PreviewFolder({ files, analysisResults }) {
  const filesDesc = [...files]
    .toSorted((a, b) => b.name < a.name ? 1 : -1)
    .map((f) => {
      if (f.name.endsWith("jpg") || f.name.endsWith("JPG")) {

        const analysis = analysisResults.find((a) => a.file == f);

        return <PreviewImage key={f.webkitRelativePath} file={f} analysis={analysis} />
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


function NewUpload({ setNewUpload, cancel }) {
  const [files, setFiles] = useState([]);
  const [name, setName] = useState("");

  return <div className="floating">

    <label className='flex flex-row items-baseline'>
      Campaign name
      <input className='m-2 text-input' value={name} onChange={(e) => setName(e.target.value)} />
    </label>

    <div className='flex flex-row'>
      <Upload setFiles={setFiles} />
    </div>
    <div className='flex flex-row'>
      <button className='cancel' onClick={cancel}>Cancel</button>
      <button className='validate' onClick={() => { setNewUpload(UploadData.new(name, files)) }} >Validate</button>
    </div>
  </div>
}
