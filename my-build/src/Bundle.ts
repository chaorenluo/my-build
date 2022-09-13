import MagicString from "magic-string";
import { Graph } from "./Graph";
import { Module } from "./Module";

export interface BundleOptions{
    entry:string
}

export class Bundle{
    graph:Graph;
    constructor(options:BundleOptions){
        // 初始化模块依赖图对象
        this.graph = new Graph({
            entry:options.entry,
            bundle:this
        })
    }

    async build(){
        // 模块打包逻辑，完成所有的ast节点操作
        return this.graph.build();
    }

    render():{ code: string }{
        // 单生成逻辑，拼接模块ast节点，产出代码
        let msBundle = new MagicString.Bundle({ separator: '\n' });
        // 按照模块拓扑顺序生成代码
        this.graph.orderedModules.forEach((module)=>{
            let data = {
                content: module.render()
            };
            msBundle.addSource(data)
        })
        return {
            code: msBundle.toString(),
        };
    }

    getModuleById(id:string){
        return this.graph.getModuleById(id)
    }

    addModule(module:Module){
        return this.graph.addModule(module);
    }
}