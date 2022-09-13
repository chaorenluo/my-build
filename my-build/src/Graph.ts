import { dirname, resolve } from 'path';
import { Bundle } from './Bundle';
import { Module } from './Module';
import {ModuleLoader} from './ModuleLoader'
interface GraphOptions {
    entry: string;
    bundle: Bundle;
  }
export class Graph{
    entryPath:string;
    basedir:string;
    moduleById:Record<string,Module> = {};
    modules:Module[] = [];
    orderedModules: Module[] = [];
    bundle: Bundle;
    moduleLoader: ModuleLoader;
    constructor(options:GraphOptions){
        const {entry,bundle} = options;
        this.entryPath  = resolve(entry);
        this.basedir = dirname(this.entryPath)
        this.bundle  = bundle ;
        // 初始化模块加载对象
        this.moduleLoader = new ModuleLoader(bundle);
    }

    async build(){
        // 1.获取并解析模块信息
        const entryModule = await this.moduleLoader.fetchModule(
            this.entryPath,
            null,
            true
        )
        // 2.构建依赖关系图
        this.modules.forEach(module => module.bind());
        // 3.模块拓扑排序
        this.orderedModules = this.sortModules(entryModule!);
        // 4.Tree sharing 标记需要包含的语句
        // 从入口处分析
        entryModule!.getExports().forEach((name) => {
            const declaration = entryModule!.traceExport(name);
            declaration!.use();
          });
    }

    sortModules(entryModule:Module){
         // 拓扑排序模块数组
         const orderedModules:Module[] = [];
        //  记录分析过的模块表
        const analysedModule:Record<string,boolean> =  {};
         // 记录模块的父模块 id 
        const parent: Record<string, string> = {};
        // 记录循环依赖
        const cyclePathList:string[][] = [];

        // 用来回调，用来定位循环依赖
        function getCyclePath(id:string,parentId:string):string[]{
            const paths = [id];
            let currrentId  = parentId;
            while(currrentId !== id){
                paths.push(currrentId);
                 // 向前回溯
                 currrentId  = parent[currrentId]
            }
            paths.push(paths[0]);
            return paths.reverse();
        }

        // 拓扑排序核心逻辑，基于依赖图的后序遍历完成
        function analyseModule(module: Module) {
            if (analysedModule[module.id]) {
              return;
            }
            for (const dependency of module.dependencyModules) {
              // 检测到循环依赖
              if (parent[dependency.id]) {
                if (!analysedModule[dependency.id]) {
                  cyclePathList.push(getCyclePath(dependency.id, module.id));
                }
                continue;
              }
              parent[dependency.id] = module.id;
              analyseModule(dependency);
            }
            analysedModule[module.id] = true;
            orderedModules.push(module);
          }
        // 从入口模块开始分析
        analyseModule(entryModule)
        // 如果有循环依赖则打印循环依赖信息
        if (cyclePathList.length) {
            cyclePathList.forEach((paths) => {
                console.log(paths)
            })
            process.exit(1)
        }
        return orderedModules;
    }

    getModuleById(id:string){
        return this.moduleById[id]
    }

    addModule(module:Module){
        if(!this.moduleById[module.id]){
            this.moduleById[module.id] = module;
            this.modules.push(module)
        }
    }
}