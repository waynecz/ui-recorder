export enum FormItemTagNames {
  SELECT = 'select',
  DATALIST = 'datalist',
  OPTION = 'option',
  INPUT = 'input',
  TEXTAREA = 'textarea'
}
const SESSION_RECORDER = '__SESSION_RECORDER__'
let NODE_ID = 1
const ELEMENTS: any = {}
class XT30Camera {
  documentNode: any
  inited: boolean
  latestSnapshot: any
  host
  isRecording = false
  initialState
  constructor(documentNode = document) {
    this.documentNode = documentNode
    this.host = new Host(documentNode)
  }

  captureEvent(a?) {
    a = a || this.capture()
    let host = this.host.capture()
    const { origin, pageUrl, baseUrl } = host

    let { screenWidth, screenHeight } = screen.capture()
    let pageData: any = {
      pageUrl,
      baseUrl,
      snapshot: a.snapshot,
      docType: a.docType,
      origin,
      top: a.top,
      left: a.left,
      frameElementId: a.frameElementId,
      hostElementId: a.hostElementId,
      hasContentElements: a.hasContentElements,
      screenHeight,
      screenWidth
    }
    if (this.documentNode === document) {
      pageData.visibilityState = a.visibilityState
    }
    return new DataNode('dom_snapshot', pageData)
  }

  capture(): any {
    const hasShadow = !!this.documentNode.shadowRoot
    const rootNode = hasShadow ? this.documentNode.shadowRoot : this.documentNode.documentElement
    const snapshot = node.serializeNode(rootNode, true)
    return {
      snapshot,
      // top: top,
      // left: left,
      docType: this.getDocType(),
      frameElementId: node.getFrameElementId(this.documentNode)
    }
  }
  private getDocType() {
    const doctype = this.documentNode.doctype
    return doctype ? helper.docTypeNodeToString(doctype) : undefined
  }
  takeSnapshotForPage(): void {}

  startRecording() {
    if (!this.isRecording) {
      this.isRecording = true
      recorder.processDocument(node.ROOT_ELEMENT, recorder)
      const snapshot = this.capture()
      this.initialState = {
        ...snapshot,
        ...screen.capture(),
        ...this.host
      }
      node.sessionstackPropertyObject(node.ROOT_ELEMENT).initialVisibilityState = snapshot.visibilityState
      recorder.start()
      recorder.startNestedDocumentsRecorders()
    }
  }
  initRecording() {}
}

class HelperTools {
  calculateCantorPair(num0, num1) {
    return ((num0 + num1) * (num0 + num1 + 1)) / 2 + num1
  }
  docTypeNodeToString(dom) {
    return `<!DOCTYPE ${dom.name}${dom.publicId ? ' PUBLIC "' + dom.publicId + '"' : ''}${
      !dom.publicId && dom.systemId ? ' SYSTEM' : ''
    }${dom.systemId ? ' "' + dom.systemId + '"' : ''}>`
  }
  isWhitespaceString(str: string) {
    return /^\s*$/.test(str)
  }
  isNullOrUndefined(obj) {
    return 'undefined' === typeof obj || null === obj
  }
  getBaseUrl(a) {
    // return $sessionstackjq('base', a).attr('href')
  }
}
export const helper = new HelperTools()
class Node {
  ROOT_ELEMENT = document.documentElement
  NODE_TYPE = {
    ELEMENT_NODE: 1,
    TEXT_NODE: 3,
    COMMENT_NODE: 8,
    DOCUMENT_NODE: 9,
    DOCUMENT_TYPE_NODE: 10,
    DOCUMENT_FRAGMENT_NODE: 11
  }
  ID_NODE_MAP = {}
  sessionstackPropertyObject(node) {
    if (!node) return {}
    let nodeInfo = node[SESSION_RECORDER]
    if (!nodeInfo) {
      nodeInfo = {}
      node[SESSION_RECORDER] = nodeInfo
    }
    return nodeInfo
  }
  serializeNode(dom, bool: boolean) {
    let node
    let serializeNode
    let serializeDom = this.serialize(dom)
    const list = []
    if (bool) {
      this.serializeChildNodes(list, dom, serializeDom)
      for (; list.length > 0; ) {
        node = list.shift()
        serializeNode = this.serialize(node.node)
        this.serializeChildNodes(list, node.node, serializeNode)
        node.parent.childNodes.push(serializeNode)
      }
    }

    return serializeDom
  }
  serializeChildNodes(list, dom, seDom) {
    if (dom && dom.childNodes && dom.childNodes.length > 0) {
      seDom.childNodes = []
      dom.childNodes.forEach(element => {
        list.push({
          parent: seDom,
          node: element
        })
      })
    }
  }
  serialize(domNode) {
    if (!domNode) return void 0
    const { NODE_TYPE } = this
    let node
    switch (domNode.nodeType) {
      case NODE_TYPE.COMMENT_NODE:
        node = this.serializeTextContext(domNode)
        break
      case NODE_TYPE.TEXT_NODE:
        node = this.serializeTextContext(domNode)
        break
      case NODE_TYPE.DOCUMENT_FRAGMENT_NODE:
        node = this.serializeElement(domNode)
        break
      case NODE_TYPE.ELEMENT_NODE:
        node = this.serializeElement(domNode)
        break
      case NODE_TYPE.DOCUMENT_TYPE_NODE:
        node = this.serializeDocTypeNode(domNode)
        break
      default:
        node = {}
    }
    node.nodeType = domNode.nodeType
    node.id = this.getId(domNode)
    const domInfo = this.sessionstackPropertyObject(domNode)
    if (domInfo.isCrossOriginFrame) {
      node.isCrossOriginFrame = true
    }
    return node
  }

  serializeTextContext(node) {
    const { textContent, parentElement } = node
    const { tagName } = parentElement
    let text = textContent

    if (tagName === 'TEXTAREA') {
      text = parentElement.value
    }
    // if (['TEXTAREA', 'OPTION'].indexOf(tagName) !== -1) {
    //   text = test(textContent)
    // }
    return {
      textContent: text
    }
  }
  serializeElement(node) {
    const { scrollTop, scrollLeft, tagName, attributes } = node
    const info: any = {
      tagName,
      scrollTop,
      scrollLeft
    }
    const map: any = {}

    // 获取参数
    if (attributes && attributes.length > 0) {
      Array.from(attributes).forEach((attr: any) => {
        map[attr.name] = attr
      })
    }

    // 确认当前元素是否为option，checkbox，radio，并添加选中状态
    // 缺陷：未判断元素是否为以上类型
    const formEds = ['selected', 'checked']
    formEds.forEach(ed => {
      if (node[ed]) {
        map[ed] = true
      }
    })

    // 判断当前元素是否为svg
    if (node.namespaceURI === 'http://www.w3.org/2000/svg') {
      info.isSvg = true
    }

    // 取表单元素值

    if (Object.values(FormItemTagNames).includes(node.tagName.toLowerCase())) {
      const { value } = node
      if (!helper.isNullOrUndefined(value)) {
        map.value = value
      }
      // 缺陷：未多input:password做处理，可以取到用户密码,取消下面代码注释即可
      // if(node.type==='password'){
      //   delete map.value
      // }
    }
    if (Object.keys(map).length > 0) {
      info.attributes = []
      for (let attr in map) {
        info.attributes.push({
          name: attr,
          value: map[attr]
        })
      }
    }

    // 样式
    if (node.nodeName === 'STYLE') {
      const sheet = node.sheet
      if (sheet) {
        try {
          const rules = sheet.rules || sheet.cssRules
          const textContent = node.textContent || ''
          if (rules && rules.length > 0 && !helper.isWhitespaceString(textContent)) {
            this.serializeStyle(info, rules)
          }
        } catch (err) {}
      }
    }
    return info
  }
  serializeDocTypeNode(node) {
    return {
      docTypeString: helper.docTypeNodeToString(node)
    }
  }
  serializeStyle(dom, styles) {
    dom.styleRules = []
    for (let style of styles) {
      let styleText
      try {
        styleText = style.cssText
      } catch (e) {
        styleText = 'html{}'
      }
      dom.styleRules.push(styleText)
    }
  }
  addNodeIndex(dom, recorder: Recorder) {
    let id = this.getId(dom)
    if (id === undefined) {
      id = this.setNewId(dom)
    }
    if (this.isFrameElement(dom)) {
      if (this.isAccessibleFrameElement(dom)) {
        this.accessibleFrameRecorders(dom, recorder)
        dom.addEventListener('load', () => {
          if (this.isAccessibleFrameElement(dom)) {
            this.accessibleFrameRecorders(dom, recorder)
            recorder.startNestedDocumentsRecorders()
          }
        })
      }
    } else {
      if (this.isAccessibleShadowDomElement(dom)) {
        this.accessibleFrameRecorders(dom, recorder)
      }
    }
    if (recorder.isShadowDomElement) {
      this.sessionstackPropertyObject(dom).isShadowDomNode = true
    }
    this.ID_NODE_MAP[id] = dom
    return id
  }
  isFrameElement(node) {
    return node && node.nodeType === this.NODE_TYPE.ELEMENT_NODE && 'contentDocument' in node
  }
  getDefaultView(dom) {
    return dom && dom.defaultView ? dom.defaultView.frameElement || dom : void 0
  }
  getFrameElementId(dom) {
    let node = this.getDefaultView(dom)
    return node ? this.getId(node) : undefined
  }
  isAccessibleFrameElement(node) {
    try {
      return !!node.contentDocument && this.dealWithANode(node)
    } catch (err) {
      return false
    }
  }
  isAccessibleShadowDomElement(dom) {
    return dom && dom.shadowRoot
  }
  isRecordingShadow(dom, recorder: Recorder) {
    let isDom = dom && dom.shadowRoot
    let id = this.getId(dom)
    return isDom && id && recorder
      ? true
      : dom && dom.contentWindow && id && recorder && !recorder.isRecordingNestedDocument(dom)
  }
  dealWithANode(node) {
    if ('about:blank' === node.src) {
      return true
    }
    const aNode = document.createElement('a')
    aNode.href = node.src
    return aNode.host === document.location.host && aNode.protocol === document.location.protocol
  }
  accessibleFrameRecorders(dom, recorder) {
    if (this.isRecordingShadow(dom, recorder)) {
      recorder.addNestedDocument(dom)
    } else {
      recorder.restartNestedDocumentRecorders(dom)
    }
  }
  generateId() {
    const id = NODE_ID
    let fId = ELEMENTS.frameElementId || 0
    NODE_ID++
    return helper.calculateCantorPair(fId, id)
  }
  setNewId(dom) {
    const id = this.generateId()
    this.sessionstackPropertyObject(dom).nodeId = id
    return id
  }
  getId(dom) {
    return this.sessionstackPropertyObject(dom).nodeId
  }
  traverseNode(dom, cb) {
    let current
    const list = [dom]
    for (; list.length > 0; ) {
      current = list.shift()
      if (current) {
        cb(current)
        current.childNodes.forEach(element => {
          list.push(element)
        })
      }
    }
  }
}
export const node = new Node()
class Recorder {
  isShadowDomElement: boolean
  queuedFrames = []
  settings = {}
  nestedDocumentsRecorders = {}
  callback
  recorderQueue
  recorders = []
  stylesRecorder
  automaticLoggingHandler: any = {
    setSettings() {},
    start() {},
    stop() {}
  }
  constructor(dom, recorderQueue, callback) {
    this.isShadowDomElement = !!dom.host
    this.callback = callback
    this.recorderQueue = recorderQueue
    this.stylesRecorder = new StylesRecorder(callback)
    // this.recorders = [new L(a, n.callback), new N(a, n.callback), new K(a, n.callback, i, n, g, n.stylesRecorder), o, n.stylesRecorder]
  }
  processDocument(dom, recorder) {
    let nodeInfo = node.sessionstackPropertyObject(dom)
    if (!nodeInfo.isProcessed) {
      node.traverseNode(dom, a => {
        node.addNodeIndex(a, recorder)
        this.stylesRecorder.addNode(a)
      })
      nodeInfo.isProcessed = true
    }
  }
  startNestedDocumentsRecorders() {
    this.queuedFrames.forEach(element => {
      this.startNestedDocumentRecorders(element)
    })
    this.queuedFrames = []
  }
  startNestedDocumentRecorders(dom) {
    const id = node.getId(dom)
    const d = dom.contentDocument || dom.shadowRoot
    const recorder = new Recorder(
      d,
      this.recorderQueue,
      this.callback
      // this.scope,
      // this.depth + 1,
      // this.recorderObject,
      // this.shadowDomObserver
    )
    recorder.setSettings(this.settings)
    this.nestedDocumentsRecorders[id] = recorder
    recorder.processDocument(d.documentElement || d, recorder)
    let f = dom.shadowRoot ? d.host : d
    let camera = new XT30Camera(f)
    let h = camera.captureEvent()
    if (typeof this.callback === 'function') {
      this.callback(h)
    }

    recorder.start()
    recorder.startNestedDocumentsRecorders()
  }
  setSettings(settings) {
    this.settings = settings
    this.automaticLoggingHandler.setSettings(settings)
  }
  start() {
    this.automaticLoggingHandler.start()
    this.recorders.forEach(element => {
      element.start()
    })
    for (let item in this.nestedDocumentsRecorders) {
      let recor = this.nestedDocumentsRecorders[item]
      recor && recor.start()
    }
  }
  isRecordingNestedDocument(dom) {
    let id = node.getId(dom)
    let recorder = this.nestedDocumentsRecorders[id]
    if (!recorder || !node.isAccessibleFrameElement(dom)) {
      return false
    }
    let { contentDocument } = dom
    return recorder.documentNode === contentDocument
  }
}
class StylesRecorder {
  callback
  isStarted = false
  constructor(callback) {
    this.callback = callback
  }
  addNode(dom) {
    if ('STYLE' === dom.nodeName) {
      let stylesheet = dom.sheet
      if (stylesheet) {
        stylesheet.nodeId = node.getId(dom)
        // 重写css接口
        const { insertRule } = stylesheet.__proto__
        const { deleteRule } = stylesheet.__proto__
        stylesheet.__proto__.insertRule = function(rule, index) {
          insertRule.apply(this, arguments)
          try {
            if (this.isStarted) {
              let cssNode = new DataNode('css_rule_insert', {
                nodeId: this.nodeId,
                rule,
                index: index || 0
              })
              this.callback(cssNode)
            }
          } catch (err) {}
        }
        stylesheet.__proto__.deleteRule = function(index) {
          deleteRule.apply(this, arguments)
          try {
            if (this.isStarted) {
              let cssNode = new DataNode('css_rule_delete', {
                nodeId: this.nodeId,
                index
              })
              this.callback(cssNode)
            }
          } catch (err) {}
        }
      }
    }
  }
  start() {
    this.isStarted = true
  }
  stop() {
    this.isStarted = false
  }
}
class DataNode {
  type
  data
  isFirst
  constructor(type, data) {
    this.type = type
    this.data = data
  }
  getType() {
    return this.type
  }
  getData() {
    return this.data
  }
  setIsFirst() {
    this.isFirst = true
  }
  getIsFirst() {
    return this.isFirst
  }
}
class Host {
  documentNode
  window
  constructor(dom) {
    this.documentNode = dom.shadowRoot || dom.host ? dom.ownerDocument : dom
    this.window = this.documentNode.defaultView
  }
  capture() {
    let location
    let origin
    let hostname
    let pageUrl
    let e = this
    if (this.window) {
      location = e.window.location
      origin = location.protocol + '//' + location.host + location.pathname
      hostname = location.hostname
      pageUrl = location.href
    }

    const { referrer } = e.documentNode
    // const baseUrl = helper.getBaseUrl(e.documentNode)
    return {
      origin,
      pageUrl,
      // baseUrl,
      hostname: hostname,
      referrer
    }
  }
}
class Screen {
  capture() {
    let screenWidth
    let screenHeight
    if ('number' === typeof window.innerWidth) {
      screenWidth = window.innerWidth
      screenHeight = window.innerHeight
    } else if (
      document.documentElement &&
      document.documentElement.clientWidth &&
      document.documentElement.clientHeight
    ) {
      screenWidth = document.documentElement.clientWidth
      screenHeight = document.documentElement.clientHeight
    } else if (document.body && document.body.clientWidth && document.body.clientHeight) {
      screenWidth = document.body.clientWidth
      screenHeight = document.body.clientHeight
    } else {
      screenWidth = window.innerWidth
      screenHeight = window.innerHeight
    }

    return { screenWidth, screenHeight }
  }
}
export const screen = new Screen()
// class CrossOriginFramesManager {
//   frames = {}
//   initializedFrames = {}
//   window
//   remoteCommandExecutor
//   intervalIds = {}
//   constructor(dom) {
//     this.window = dom
//     // this.remoteCommandExecutor = new Ia(this.window)
//   }
// }
// class RemoteCommandExecutor {}
export const recorder = new Recorder(document, {}, () => {})
const XT30 = new XT30Camera()

export default XT30
