import { Analysis } from "../utils";

const blobUrlCache = new WeakMap();

function getBlobUrl(file: File) {
  if (!blobUrlCache.has(file)) {
    blobUrlCache.set(file, URL.createObjectURL(file));
  }
  return blobUrlCache.get(file);
}

function PreviewImage({ file, analysis }: { file: File, analysis?: Analysis }) {

  let c;
  if (analysis == undefined) {
    c = "";
  } else {
    if (analysis.overExposed) { c = "overExposed"; }
    else if (analysis.underExposed) { c = "underExposed" }
    else { c = "ok"; }
  }

  return <li key={file.webkitRelativePath} className="imgPreview">
    <img src={getBlobUrl(file)} loading="lazy" title={file.name} />
    <div className={c}>{c}</div>
  </li>
}

export function PreviewFolder({ files, analysisResults }: { files: File[], analysisResults: Analysis[] }) {
  const filesDesc = [...files]
    .toSorted((a, b) => b.name < a.name ? 1 : -1)
    .map((f) => {
      if (f.name.endsWith("jpg") || f.name.endsWith("JPG")) {

        const analysis = analysisResults.find((a) => a.file.name === f.name);
        
        return <PreviewImage key={f.webkitRelativePath} file={f} analysis={analysis} />
      }
      return <li> {f.size}B <em>{f.webkitRelativePath}</em> </li>
    });
  return <div className="imagesGrid">{filesDesc}</div>
}


function Tag({ name, number, onClick, enabled }: { name: string, number: number, onClick: () => void, enabled: Boolean }) {
  const enabledClass = enabled ? '' : 'disabled';
  return <div
    className={'tag ' + name + ' ' + enabledClass}
    onClick={onClick}>
    {number} <b>{name}</b>
  </div>
}


export function AnalysisPreview({ files, analysis, filters, setFilters }: { files: File[], analysis: Analysis[], filters: any, setFilters: (f: any) => void }) {
  console.log("Repainting analysis", analysis);

  const nPictures = files.length;
  const overExposed = analysis.filter((x) => x.overExposed).length;
  const underExposed = analysis.filter((x) => x.underExposed).length;
  const ok = analysis.filter((x) => !x.overExposed && !x.underExposed).length;
  const analyzing = nPictures - analysis.length;

  const filesToShow = files.filter((file) => {
    const a = analysis?.find((a) => a.file.name == file.name);
    if (a == undefined && filters.analyzing) return true;
    if (a?.overExposed && filters.overExposed) return true;
    if (a?.underExposed && filters.underExposed) return true;
    if ((!a?.overExposed && !a?.underExposed) && filters.ok) return true;
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