'use client'

import { useState, useEffect, ReactNode, useMemo, useRef, ChangeEvent } from "react";
import { ChevronRight, ChevronDown, UploadCloud } from "lucide-react";
import { Analysis, UploadData } from './utils'
import { AnalysisPreview, PreviewFolder } from "./analysisPreview/analysisPreview";
import { NewUpload } from "./NewUpload";

export default function Home() {
  const [uploads, setUploads] = useState<UploadData[]>([]);
  const [showNewUpload, setShowNewUpload] = useState(false);
  const [filters, setFilters] = useState({ ok: true, overExposed: true, underExposed: true, analyzing: true });

  const uploader = useRef<Worker>(undefined);
  const analyser = useRef<Worker>(undefined);
  
  useEffect(
    () => { 
      const worker = new Worker(new URL("uploader.ts", import.meta.url));
      worker.onmessage = (e) => {
        console.log("Receive message from worker", e.data);
        setUploads((prev) => [prev[0].updateProgress(e.data), ...prev.slice(1)]);
      };
      uploader.current = worker;
      return () => {
        uploader.current?.terminate();
      };
    },
    []
  );
  useEffect(
    () => { 
      const worker = new Worker(new URL("analyser.ts", import.meta.url));
      worker.onmessage = (e) => {
        console.log("Receive message from analyser", e.data);
        setUploads((prev: UploadData[]) => [prev[0].updateAnalysis(e.data), ...prev.slice(1)])
      };
      analyser.current = worker;
      return () => {
        analyser.current?.terminate();
      };
    },
    []
  );

  let uploadsView: ReactNode = uploads.map((u, row) => {
    return <UploadRow key={u.name} upload={u} setFold={(f) => setUploads((prev) => prev.map((up, index) => {
      if (index == row) return up.updateFolded(f)
      else return up
    }))}>
      <AnalysisPreview files={u.files} analysis={u.analysis || []} filters={filters} setFilters={setFilters} />
    </UploadRow> 
  });

  if (!uploads.length) {
    uploadsView = <em>No uploads yet</em>;
  }

  return (
    <div className='main'>
      <div className='top'>
        <UploadCloud style={{alignSelf: "center", width: "2em", height:"2em", marginBottom: "1em", marginRight: "1em"}}/>
        <h1 className='grow'>My uploads</h1>
        <a href="/login" className="login-button">Set access credentials</a>
        <button className='new' onClick={() => setShowNewUpload(true)}>+ New upload</button>


        {showNewUpload ?
          <NewUpload
            setNewUpload={(up: UploadData) => {
              console.log("New upload", up);
              if (up.shouldUpload) {
                uploader.current?.postMessage(up);
              }

              if (up.shouldAnalyze) {
                analyser.current?.postMessage(up.files);
              }

              setUploads(uploads.concat([up]));
              setShowNewUpload(false);
            }}
            cancel={() => setShowNewUpload(false)} />
          : <></>}
      </div>

      {uploadsView}
    </div>
  );
}


function UploadRow({ upload, setFold, children }: { upload: UploadData, setFold: (f: boolean) => void, children: any }) {
  return (
  <div key={upload.name} className='upload-row flex flex-col' onClick={() => setFold(!upload.fold)}>
    <div className='flex flex-row items-center w-full'>
      {upload.fold ? <ChevronRight /> : <ChevronDown />}
      <div className='title'>{upload.name}</div>
      <div className='pic'>{upload.number_pictures} pictures</div>
      <LoadingBar percent={upload.percent} />
    </div>
    {
      (!upload.fold) ? <div>{children}</div>  : <></>
    }
  </div>
  )
}

function LoadingBar({ percent }: {percent: number}) {
  return <div className='flex flex-row items-center grow'>
    <div className='loading-bar'>
      <div className='done' style={{ width: percent + '%' }} />
    </div>
    <div className='m-2' >{Math.round(percent)} %</div>
  </div>
}

