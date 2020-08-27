const {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  Menu,
  MenuItem
} = require('electron')
const path = require('path')
const url = require('url')
const fs = require('fs')
const isDev = require('electron-is-dev')
const { exec } = require('child_process')
const process = require('process')
const { version } = require('../package.json')
const extract = require('extract-zip')

/* eslint-disable */
const util = {
  uuidv4: () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  },
  message: (title, content, from = null) => {
    if (typeof title != "string") throw TypeError();
    return {
      uuid: util.uuidv4(),
      from: from,
      title: title,
      content: content,
    }
  },
  isMessage: (msg) => {
    if (typeof msg.uuid !== 'string') return false;
    if (typeof msg.from !== 'string' && msg.from !== null) return false;
    if (typeof msg.title !== 'string') return false;
    if (typeof msg.content === 'undefined') return false;
    return true;
  }
}
/* eslint-enable */

/* ----------------------- WINDOW STUFF --------------------------- */

let win = null

async function createWindow () {
  const prodUrl = url.format({
    pathname: path.join(__dirname, 'index.html'),
    protocol: 'file:',
    slashes: true
  })

  // Create the browser window.
  win = new BrowserWindow({
    width: 800,
    height: 600,
    frame: false,
    show: false,
    webPreferences: {
      nodeIntegration: false, // is default value after Electron v5
      contextIsolation: true, // protect against prototype pollution
      enableRemoteModule: false, // turn off remote
      spellcheck: true,
      title: isDev ? prodUrl : 'HyperSigil',
      preload: path.join(__dirname, 'preload.js') // use a preload script
    }
  })

  const splash = new BrowserWindow({ width: 300, height: 300, transparent: false, frame: false, alwaysOnTop: true })
  splash.loadURL(`file://${__dirname}/splash.html`)

  // Specify entry point
  if (isDev === true) {
    win.loadURL('http://localhost:3000')
  } else {
    win.loadURL(prodUrl)
  }

  Menu.setApplicationMenu(null)
  // win.session.setSpellCheckerLanguages(['en-US', 'fr', 'es'])

  // Remove window once app is closed
  win.on('closed', function () {
    win = null
  })

  win.once('ready-to-show', () => {
    splash.destroy()
    win.show()
    sendMessage('version', { version: version })
  })

  // ------ SPELLCHECKING -----

  win.webContents.on('context-menu', (event, params) => {
    if (params.dictionarySuggestions.length > 0) {
      const menu = new Menu()

      // Add each spelling suggestion
      for (const suggestion of params.dictionarySuggestions) {
        menu.append(new MenuItem({
          label: suggestion,
          click: () => win.webContents.replaceMisspelling(suggestion)
        }))
      }

      // Allow users to add the misspelled word to the dictionary
      if (params.misspelledWord) {
        menu.append(
          new MenuItem({
            label: 'Add to dictionary',
            click: () => win.webContents.session.addWordToSpellCheckerDictionary(params.misspelledWord)
          })
        )
      }

      menu.popup()
    }
  })
}

app.on('ready', function () {
  createWindow()
})

app.on('activate', () => {
  if (win === null) {
    createWindow()
  }
})

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// ---- ACTIONS -----
function openDocument () {
  const options = {
    title: 'Open file',
    defaultPath: '*.utf8',
    buttonLabel: 'Open',
    filters: [
      { name: 'Text Documents', extensions: ['txt', 'utf8'] },
      { name: 'All Files', extensions: ['*'] }
    ],
    properties: ['openFile', 'createDirectory', 'multiSelections']
  }

  const files = dialog.showOpenDialogSync(win, options)

  if (files) {
    const texts = files.map(file => [file, fs.readFileSync(file, { encoding: 'utf8', flag: 'r' })])
    sendMessage('set-text', { texts: texts })
  }
}

function saveDocument (path, text) {
  const options = {
    title: 'Save file',
    defaultPath: '*.utf8',
    buttonLabel: 'Save',
    filters: [
      { name: 'Text Documents', extensions: ['txt', 'utf8'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  }

  let filename = null
  if (!path) {
    filename = dialog.showSaveDialogSync(win, options)
    if (filename) {
      fs.writeFileSync(filename, text)
      sendMessage('set-path', filename)
    }
  } else {
    fs.writeFileSync(path, text)
    sendMessage('set-path', path)
  }
}

function saveDocumentAs (text) {
  const options = {
    title: 'Save file as...',
    defaultPath: '*.utf8',
    buttonLabel: 'Save As',
    filters: [
      { name: 'Text Documents', extensions: ['txt', 'utf8'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  }

  const filename = dialog.showSaveDialogSync(win, options)
  if (filename) {
    fs.writeFileSync(filename, text)
    sendMessage('set-path', filename)
  }
}

function findPackageJSON (root) {
  if (root === undefined || root === null || root === '' || root === '/' || root.endsWith(':\\')) {
    throw new Error('package.json not found in any folder within this path')
  }
  const mypath = path.dirname(root)
  const dir = fs.readdirSync(mypath)
  for (const filename of dir) {
    if (path.basename(filename) === 'package.json') return mypath
  }
  return findPackageJSON(mypath)
}

function runCommand (xpath, command) {
  const cd = findPackageJSON(xpath)
  process.chdir(cd)
  exec('start cmd.exe /C ' + command, (error, stdout, stderr) => {
    if (error) {
      throw new Error(error.message)
    }
  })
}

function openFolder () {
  const options = {
    title: 'Open Directory',
    buttonLabel: 'Open Directory',
    properties: ['openDirectory', 'createDirectory']
  }

  const files = dialog.showOpenDialogSync(win, options)
  if (files) return files[0]
  else return undefined
}

async function newProject (name, target) {
  try {
    let source = path.join(__dirname, '../templates/template.zip')
    if (!fs.existsSync(source)) source = path.join(__dirname, '../../../templates/template.zip')
    await extract(source, { dir: target })
    const pac = JSON.parse(fs.readFileSync(path.join(target, './package.json')))
    fs.writeFileSync(path.join(target, './package.json'),
      JSON.stringify({
        ...pac,
        name: name
          .toLowerCase()
          .trim()
          .replace(/ /g, '-')
          .replace(/^\.|^_/, '')
          .replace(/~|\)|\(|'|!|\*|/g, '')
          .slice(0, 210),
        title: name,
        dependencies: {
          ...pac.dependencies,
          '@hypersigil/engine': 'file:./engine'
        }
      }, null, 2)
    )
    runCommand(path.join(target, 'dummyfile'), 'npm install')
  } catch (err) {
    sendMessage('error', err.message)
  }
}

// --------------- Communiaction electron <-> react ---------------------------
const callbackList = new Map()
ipcMain.on('toMain', (event, args) => {
  if (!util.isMessage(args)) return
  if (args.from && callbackList.get(args.from)) {
    callbackList.get(args.from)(args)
  } else {
    try {
      if (args.title === 'toggle-devtools' && isDev === true) {
        win.toggleDevTools()
      } else if (args.title === 'open-document') {
        openDocument()
      } else if (args.title === 'save-document') {
        saveDocument(args.content.path, args.content.text)
      } else if (args.title === 'save-document-as') {
        saveDocumentAs(args.content.text)
      } else if (args.title === 'close-app') {
        app.quit()
      } else if (args.title === 'run-command') {
        runCommand(args.content.path, args.content.command)
      } else if (args.title === 'open-folder-dialog') {
        reply(args, 'open-folder-dialog', { from: args.content.from, path: openFolder() })
      } else if (args.title === 'new-project') {
        newProject(args.content.name, args.content.path)
      } else if (args.title === 'set-zoom') {
        win.webContents.setZoomFactor(args.content.factor)
      }
    } catch (e) {
      if (e && e.stack && e.message) {
        sendMessage('error', e.message)
      } else throw e
    }
  }
})

function reply (msg, title, answer) {
  sendMessage(title, answer, msg.uuid)
}

function sendMessage (title, message, from = null) {
  const msg = util.message(title, message, from)
  return win.webContents.send('fromMain', msg)
}
