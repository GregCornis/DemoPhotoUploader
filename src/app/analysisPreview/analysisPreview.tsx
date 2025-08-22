import { useState } from "react";
import { Analysis } from "../utils";

const blobUrlCache = new WeakMap();

function getBlobUrl(file: File) {
    if (!blobUrlCache.has(file)) {
        blobUrlCache.set(file, URL.createObjectURL(file));
    }
    return blobUrlCache.get(file);
}

function PreviewImage({ file, analysis, style, onClick }: { file: File, analysis?: Analysis, style: any, onClick: () => void }) {

    let c;
    if (analysis == undefined) {
        c = "";
    } else {
        if (analysis.overExposed) { c = "overExposed"; }
        else if (analysis.underExposed) { c = "underExposed" }
        else { c = "ok"; }
    }

    return <li key={file.webkitRelativePath} className="imgPreview">
        <img src={getBlobUrl(file)} loading="lazy" title={file.name} onClick={onClick} style={style} />
        <div className={c}>{c}</div>
    </li>
}

export function PreviewFolder({ files, analysisResults }: { files: File[], analysisResults: Analysis[] }) {
    const [currentIndex, setCurrentIndex] = useState<number | null>(null); // null means no fullscreen

    const sortedFiles = [...files]
        .toSorted((a, b) => b.name < a.name ? 1 : -1)


    const closeImage = () => {
        setCurrentIndex(null);
    };

    const showPrev = (e) => {
        e.stopPropagation();
        setCurrentIndex((prev) => (prev > 0 ? prev - 1 : sortedFiles.length - 1));
    };

    const showNext = (e) => {
        e.stopPropagation();
        setCurrentIndex((prev) => (prev < sortedFiles.length - 1 ? prev + 1 : 0));
    };


    const filesDesc = sortedFiles
        .map((f, index) => {
            if (f.name.endsWith("jpg") || f.name.endsWith("JPG")) {

                const analysis = analysisResults.find((a) => a.file.name === f.name);

                return <PreviewImage 
                key={f.webkitRelativePath} 
                file={f} 
                analysis={analysis} 
                style={{cursor: "zoom-in"}}
                onClick={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    setCurrentIndex(index)
                }} />
            }
            return <li> {f.size}B <em>{f.webkitRelativePath}</em> </li>
        });
    return <div className="imagesGrid">
        {filesDesc}
        {currentIndex !== null && (
            <div
                onClick={closeImage}
                style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    background: "rgba(0,0,0,0.9)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 9999,
                    color: "white"
                }}
            >
                
                <button
                    onClick={showPrev}
                    style={{
                        position: "absolute",
                        left: "20px",
                        fontSize: "2rem",
                        background: "transparent",
                        color: "white",
                        border: "none",
                        cursor: "pointer"
                    }}
                >
                    ‹
                </button>

                
                <PreviewImage
                    key={sortedFiles[currentIndex].webkitRelativePath}
                    file={sortedFiles[currentIndex]}
                    style={{maxWidth: "90%", maxHeight: "90%", margin: "auto"}}
                    analysis={analysisResults.find((a) => a.file.name === sortedFiles[currentIndex].name)} onClick={() => { }} />
                <img
                    src={sortedFiles[currentIndex]}
                    alt=""
                    style={{ maxWidth: "90%", maxHeight: "90%" }}
                />

                
                <button
                    onClick={showNext}
                    style={{
                        position: "absolute",
                        right: "20px",
                        fontSize: "2rem",
                        background: "transparent",
                        color: "white",
                        border: "none",
                        cursor: "pointer"
                    }}
                >
                    ›
                </button>
            </div>
        )}
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


export function AnalysisPreview({ files, analysis, filters }: { files: File[], analysis: Analysis[], filters: any}) {
    console.log("Repainting analysis", analysis);

    
    const filesToShow = files.filter((file) => {
        const a = analysis?.find((a) => a.file.name == file.name);
        if (a == undefined && filters.analyzing) return true;
        if (a?.overExposed && filters.overExposed) return true;
        if (a?.underExposed && filters.underExposed) return true;
        if ((!a?.overExposed && !a?.underExposed) && filters.ok) return true;
        return false;
    });

    return <div className='preview'>
        <PreviewFolder files={filesToShow} analysisResults={analysis} />
    </div>
}

export function TagRow({nPictures, ok, overExposed, underExposed, analyzing, filters, setFilters}) {
    return <div className='tags'>
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
}