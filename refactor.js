const fs = require('fs');
const path = require('path');
const jscodeshift = require('jscodeshift');

const j = jscodeshift.withParser('babel');

function transformFile(filePath, transformer) {
    const src = fs.readFileSync(filePath, 'utf8');
    const root = j(src);
    const changed = transformer(root, j);
    if (changed) {
        fs.writeFileSync(filePath, root.toSource(), 'utf8');
        console.log(`Refactored ${filePath}`);
    }
}

// Transform Repositories
const reposPath = path.join(__dirname, 'electron', 'repositories');
fs.readdirSync(reposPath).forEach(file => {
    if (!file.endsWith('.js')) return;
    const fullPath = path.join(reposPath, file);
    
    transformFile(fullPath, (root, j) => {
        let changed = false;

        // Make all methods async
        root.find(j.MethodDefinition).forEach(path => {
            if (path.node.key.name !== 'constructor' && !path.node.value.async) {
                path.node.value.async = true;
                changed = true;
            }
        });

        // Add await to db.prepare().get/all/run
        root.find(j.CallExpression).forEach(path => {
            const callee = path.node.callee;
            if (callee.type === 'MemberExpression') {
                const propName = callee.property.name;
                if (['get', 'all', 'run'].includes(propName)) {
                    // Check if parent is db.prepare(...)
                    // But actually any .get()/.all()/.run() is probably db related.
                    // Check if it's already awaited
                    if (path.parentPath.node.type !== 'AwaitExpression') {
                        path.replace(j.awaitExpression(path.node));
                        changed = true;
                    }
                }
            }
        });

        // Add await to this.something()
        root.find(j.CallExpression).forEach(path => {
            const callee = path.node.callee;
            if (callee.type === 'MemberExpression' && callee.object.type === 'ThisExpression') {
                if (path.parentPath.node.type !== 'AwaitExpression') {
                    path.replace(j.awaitExpression(path.node));
                    changed = true;
                }
            }
        });

        // Convert budgets.map(budget => ...) into await Promise.all(budgets.map(async budget => ...)) if it contains an await
        root.find(j.CallExpression, {
            callee: {
                property: { name: 'map' }
            }
        }).forEach(path => {
            const mapCb = path.node.arguments[0];
            if (mapCb && (mapCb.type === 'ArrowFunctionExpression' || mapCb.type === 'FunctionExpression')) {
                // If the callback has any AwaitExpressions inside, make sure it's async and wrapped in Promise.all
                const hasAwait = j(mapCb).find(j.AwaitExpression).size() > 0;
                if (hasAwait) {
                    mapCb.async = true;
                    // Check if already in Promise.all
                    const isPromiseAll = path.parentPath.node.type === 'CallExpression' && 
                                         path.parentPath.node.callee.property && 
                                         path.parentPath.node.callee.property.name === 'all';
                    if (!isPromiseAll) {
                        path.replace(j.awaitExpression(
                            j.callExpression(
                                j.memberExpression(j.identifier('Promise'), j.identifier('all')),
                                [path.node]
                            )
                        ));
                        changed = true;
                    }
                }
            }
        });
        
        // Handle db.transaction
        root.find(j.CallExpression, { callee: { property: { name: 'transaction' } } }).forEach(p => {
             // ensure transaction callbacks are async
             const cb = p.node.arguments[0];
             if (cb && !cb.async) {
                 cb.async = true;
                 changed = true;
             }
        });
        
        // Find execution of transaction function: const transaction = db.transaction(...); transaction();
        root.find(j.VariableDeclarator).forEach(p => {
             if (p.node.init && p.node.init.type === 'CallExpression' && p.node.init.callee.property && p.node.init.callee.property.name === 'transaction') {
                 const varName = p.node.id.name; // e.g., 'transaction'
                 // find calls to `transaction()` inside the same block
                 j(p.parentPath.parentPath).find(j.CallExpression, { callee: { name: varName } }).forEach(tp => {
                     if (tp.parentPath.node.type !== 'AwaitExpression') {
                         tp.replace(j.awaitExpression(tp.node));
                         changed = true;
                     }
                 });
             }
        });

        return changed; // return true if anything changed
    });
});

// Transform Services
const servicesPath = path.join(__dirname, 'electron', 'services');
fs.readdirSync(servicesPath).forEach(file => {
    if (!file.endsWith('.js')) return;
    const fullPath = path.join(servicesPath, file);
    
    transformFile(fullPath, (root, j) => {
        let changed = false;

        root.find(j.CallExpression).forEach(path => {
            const callee = path.node.callee;
            if (callee.type === 'MemberExpression' && callee.object.type === 'Identifier') {
                const isRepo = callee.object.name.endsWith('Repository');
                const isService = callee.object.name.endsWith('Service'); 
                if ((isRepo || isService) && path.parentPath.node.type !== 'AwaitExpression') {
                    path.replace(j.awaitExpression(path.node));
                    changed = true;
                }
                // Handle the case where repo calls are property of service, e.g. this.clientRepository (if used)
            } else if (callee.type === 'MemberExpression' && callee.object.type === 'MemberExpression' && callee.object.property) {
                const isRepo2 = callee.object.property.name && callee.object.property.name.endsWith('Repository');
                if (isRepo2 && path.parentPath.node.type !== 'AwaitExpression') {
                    path.replace(j.awaitExpression(path.node));
                    changed = true;
                }
            }
        });

        // Ensure all methods are async
        root.find(j.MethodDefinition).forEach(path => {
            if (path.node.key.name !== 'constructor' && !path.node.value.async) {
                path.node.value.async = true;
                changed = true;
            }
        });

        return changed;
    });
});

console.log('Done refactoring!');
