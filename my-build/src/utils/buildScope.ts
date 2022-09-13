import { walk } from './walk';
import { Scope } from '../ast/Scope';
import { Statement } from '../Statement';

import {
    NodeType,
    Node,
    VariableDeclaration,
    VariableDeclarator
  } from '../../../ast-parser/src/index';

  import { FunctionDeclaration } from  '../../../ast-parser/src/index';
import { Declaration } from '../ast/Declaration';

  export function buildScope(statement:Statement){
  const { node, scope: initialScope } = statement;
    let scope = initialScope;
    // 遍历AST
    walk(node,{
        // 遵循深度优先原则，每进入和离开一个节点会触发enter和leave钩子
        // 如a的子节点为b,那么触发顺序为a-enter,b-enter、b-leave、a-leave
        enter(node:Node){
            // function foo() {...}
            if(node.type === NodeType.FunctionDeclaration){
                scope.addDeclaration(node,false);
            }
            // var let const
            if(node.type === NodeType.VariableDeclaration){
                const currentNode = node as VariableDeclaration;
                const isBlockDeclaration = currentNode.kind !=='var';
                currentNode.declarations.forEach((declarator:VariableDeclarator)=>{
                    scope.addDeclaration(declarator,isBlockDeclaration)
                })
            }

            let newScope;

            // function scope
            if(node.type === NodeType.FunctionDeclaration){
                const currentNode = node as FunctionDeclaration;
                newScope = new Scope({
                    parent:scope,
                    block:false,
                    paramNodes:currentNode.params,
                    statement
                })
            }
            // 记录scope父子关系
            if(newScope){
                Object.defineProperty(node,'_scope',{
                    value:newScope,
                    configurable:true
                });
                scope = newScope;
            }
        },
        leave(node: any) {
            // 更新当前作用域
            // 当前 scope 即 node._scope
            if (node._scope && scope.parent) {
              scope = scope.parent;
            }
          }
    })
  }