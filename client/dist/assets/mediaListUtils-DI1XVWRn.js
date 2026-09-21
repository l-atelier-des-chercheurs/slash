const s=new Set(["image","video","audio","text","pdf","url","stl","obj"]);function a(t){return!(t!=null&&t.$type)||t.$type.startsWith("canvas_")?!1:s.has(t.$type)}export{a as i};
