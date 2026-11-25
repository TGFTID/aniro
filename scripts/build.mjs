import { execFileSync } from 'node:child_process'
import { copyFile, mkdir, mkdtemp, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises'
import { resolve, join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const output = resolve(root, 'dist')
const temporary = await mkdtemp(join(root, '.build-'))
const assets = ['index.html', 'src/aniro-logo.png', 'data/catalog.json', 'docs/ANIRO-DATA-SOURCES.md', 'docs/ANIRO-SELECTION-RULES.md']
for (const [directory, allowed] of [['src', /\.(?:js|css)$/], ['evidence', /\.pdf$/i]]) {
  const entries = await readdir(join(root, directory), {withFileTypes:true})
  assets.push(...entries.filter(entry => entry.isFile() && allowed.test(entry.name)).map(entry => directory + '/' + entry.name))
}
if (assets.filter(name => name.startsWith('evidence/')).length !== 6) throw new Error('Wymagane jest sześć publicznych PDF.')
const git = (...args) => execFileSync('git', args, {cwd:root, encoding:'utf8', stdio:['ignore','pipe','pipe']}).trim()
let commit = 'wersja robocza'
try {
  if (!git('status', '--porcelain', '--untracked-files=all')) commit = git('rev-parse', 'HEAD')
} catch { /* Pierwszy lokalny build może poprzedzać pierwszy commit. */ }
try {
  for (const file of assets) {
    const destination = join(temporary, file)
    await mkdir(resolve(destination, '..'), {recursive:true})
    await copyFile(join(root, file), destination)
  }
  const data = JSON.parse(await readFile(join(temporary, 'data/catalog.json'), 'utf8'))
  if (data.count !== 112 || new Set(data.products.map(row => row.id)).size !== 112) throw new Error('Katalog nie przeszedł kontroli identyfikatorów.')
  await writeFile(join(temporary, 'version.json'), JSON.stringify({commit, catalogDate:data.source_snapshot_date}) + '\n')
  // A running Windows preview can hold dist as its working directory.
  // Replace staged files individually and publish the version after all assets.
  await mkdir(output, {recursive:true})
  const keep = new Set([...assets, 'version.json'])
  const previous = await readdir(output, {recursive:true, withFileTypes:true})
  const marker = join(temporary, 'building.json')
  await writeFile(marker, JSON.stringify({commit:'w trakcie budowy', catalogDate:data.source_snapshot_date}))
  await rename(marker, join(output, 'version.json'))
  for (const file of [...assets.filter(file => file !== 'index.html'), 'index.html']) {
    await mkdir(resolve(join(output, file), '..'), {recursive:true})
    await rename(join(temporary, file), join(output, file))
  }
  for (const item of previous) {
    const path = join(item.parentPath, item.name)
    if (item.isFile() && !keep.has(relative(output, path).split(sep).join('/'))) await rm(path)
  }
  await rename(join(temporary, 'version.json'), join(output, 'version.json'))
  console.log('Zbudowano Aniro:', commit, '·', data.count, 'produktów ·', assets.length, 'plików źródłowych')
} finally {
  await rm(temporary, {recursive:true, force:true})
}
