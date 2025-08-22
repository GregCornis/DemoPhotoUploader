import { ChangeEvent, useState } from "react";
import { UploadData } from "./utils";


function Upload({ setFiles }: { setFiles: ((_: File[]) => void) }) {

  function selectedFolder(event: ChangeEvent) {
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


export function NewUpload({ setNewUpload, cancel }) {
  const [files, setFiles] = useState([]);
  const [name, setName] = useState("");
  const [subfolder, setSubfolder] = useState("test/");
  const [shouldUpload, setShouldUpload] = useState(true);
  const [shouldAnalyze, setShouldAnalyze] = useState(true);

  function onValidate() {
    setNewUpload(UploadData.new(name, files, shouldAnalyze, shouldUpload, subfolder))
  }

  return <div className="floating">
    <h2>New upload</h2>

    <label className='flex flex-row items-baseline'>
      Campaign name
      <input className='m-2 text-input' value={name} onChange={(e) => setName(e.target.value)} />
    </label>

    <div className='flex flex-row'>
      <Upload setFiles={setFiles} />
    </div>


    <label className='flex flex-row items-baseline'>
      Sub folder
      <input className='m-2 text-input' value={subfolder} onChange={(e) => setSubfolder(e.target.value)} />
    </label>


    <div className="flex" style={{ gap: "1rem", alignItems: "center", marginBottom: "1em" }}>
      <label>
        <input type="checkbox"
          checked={shouldUpload}
          onChange={(e) => setShouldUpload(e.target.checked)} />
        Upload
      </label>
      <label>
        <input type="checkbox"
          checked={shouldAnalyze}
          onChange={(e) => setShouldAnalyze(e.target.checked)} />
        Analyze
      </label>
    </div>

    <div className='flex flex-row'>
      <button className='cancel' onClick={cancel}>Cancel</button>
      <button disabled={!files.length} className='validate' onClick={onValidate} >Validate</button>
    </div>
  </div>
}
