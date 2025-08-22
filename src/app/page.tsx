'use client'

import { useState, useEffect, ReactNode, useMemo, useRef, ChangeEvent } from "react";
import { ChevronRight, ChevronDown, UploadCloud } from "lucide-react";
import { Analysis, readableFileSize, UploadData } from './utils'
import { AnalysisPreview, PreviewFolder, TagRow } from "./analysisPreview/analysisPreview";
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
    return <UploadRow
      key={u.name}
      upload={u}
      filters={filters}
      setFilters={setFilters}
      setFold={(f) => setUploads((prev) => prev.map((up, index) => {
        if (index == row) return up.updateFolded(f)
        else return up
      }))}>
      <AnalysisPreview files={u.files} analysis={u.analysis || []} filters={filters} />
    </UploadRow>
  });

  if (!uploads.length) {
    uploadsView = <em>No uploads yet</em>;
  }

  return (
    <div className='main'>
      <div className='top'>
        <UploadCloud style={{ alignSelf: "center", width: "2em", height: "2em", marginBottom: "1em", marginRight: "1em" }} />
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

              setUploads([up, ...uploads]);
              setShowNewUpload(false);
            }}
            cancel={() => setShowNewUpload(false)} />
          : <></>}
      </div>

      {uploadsView}
    </div>
  );
}


function UploadRow({ upload, setFold, filters, setFilters, children }: { upload: UploadData, filters: any, setFilters: (f: any) => void, setFold: (f: boolean) => void, children: any }) {
  const nPictures = upload.files.length;
  const overExposed = upload.analysis?.filter((x) => x.overExposed).length ?? 0;
  const underExposed = upload.analysis?.filter((x) => x.underExposed).length ?? 0;
  const ok = upload.analysis?.filter((x) => !x.overExposed && !x.underExposed).length ?? 0;
  const analyzing = nPictures - (upload.analysis?.length ?? 0);
  const totalSize = readableFileSize(upload.files.reduce((a, b) => a + b.size, 0))

  return (
    <div key={upload.name} className='upload-row flex flex-col'>
      <div className='flex flex-row items-center w-full'>
        <Chevron fold={upload.fold} setFold={setFold} />
        <div className='title'>{upload.name}</div>
        <div className='pic grow'>{upload.number_pictures} pictures / {totalSize}</div>
        <LoadingBar percent={upload.percent} />
      </div>
      <TagRow nPictures={nPictures} ok={ok} overExposed={overExposed} underExposed={underExposed} analyzing={analyzing} filters={filters} setFilters={setFilters} />

      {
        (!upload.fold) ? <div>{children}</div> : <></>
      }
    </div>
  )
}

function LoadingBar({ percent }: { percent: number }) {
  return <div className='flex flex-row items-center' style={{ width: "20%" }}>
    <div className='loading-bar grow'>
      <div className='done' style={{ width: percent + '%' }} />
    </div>
    <div className='m-2' >{Math.round(percent)} %</div>
  </div>
}

function Chevron({ fold, setFold }: { fold: boolean, setFold: (f: boolean) => void }) {
  const style = {cursor: "pointer", marginRight: "10px"}
  return <>
    {fold 
      ? <ChevronRight onClick={() => setFold(false)} style={style}/> 
      : <ChevronDown onClick={() => setFold(true)} style={style}/>}
  </>
}