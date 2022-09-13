import {Bundle} from './Bundle';
export interface BuildOptions{
    inpurt:string
}

export function build(options:BuildOptions){
    const bundle = new Bundle({
        entry:options.inpurt
    })

    return bundle.build().then(()=>{
        return {
            generate:()=> bundle.render()
        }
    })
}