// Lightweight Production React 18 Hooks & DOM Runtime for Offline / Sandbox Canvas Execution
(function (global) {
  const Fragment = Symbol('React.Fragment');
  const StrictMode = ({ children }) => children;

  function createElement(type, props, ...children) {
    const flatChildren = [];
    const pushChildren = (arr) => {
      for (let i = 0; i < arr.length; i += 1) {
        const c = arr[i];
        if (Array.isArray(c)) {
          pushChildren(c);
        } else if (c !== null && c !== undefined && c !== false && c !== true) {
          flatChildren.push(c);
        }
      }
    };
    pushChildren(children);
    return {
      type,
      props: { ...(props || {}), children: flatChildren },
    };
  }

  // Component hook state store keyed by component path id
  const hookStore = new Map();
  let currentComponentId = null;
  let currentHookIndex = 0;
  let pendingEffects = [];
  let rootRenderer = null;
  let isRendering = false;
  let renderQueued = false;

  function scheduleRender() {
    if (isRendering) {
      renderQueued = true;
      return;
    }
    if (rootRenderer) {
      rootRenderer();
    }
  }

  function getComponentHooks(id) {
    if (!hookStore.has(id)) {
      hookStore.set(id, []);
    }
    return hookStore.get(id);
  }

  function depsChanged(oldDeps, newDeps) {
    if (!oldDeps || !newDeps) return true;
    if (oldDeps.length !== newDeps.length) return true;
    for (let i = 0; i < oldDeps.length; i += 1) {
      if (!Object.is(oldDeps[i], newDeps[i])) return true;
    }
    return false;
  }

  function useState(initialValue) {
    const compId = currentComponentId;
    const idx = currentHookIndex++;
    const hooks = getComponentHooks(compId);
    if (hooks.length <= idx) {
      const init = typeof initialValue === 'function' ? initialValue() : initialValue;
      hooks[idx] = { state: init };
    }
    const hook = hooks[idx];
    const setState = (updater) => {
      const nextState = typeof updater === 'function' ? updater(hook.state) : updater;
      if (!Object.is(hook.state, nextState)) {
        hook.state = nextState;
        scheduleRender();
      }
    };
    return [hook.state, setState];
  }

  function useRef(initialValue) {
    const compId = currentComponentId;
    const idx = currentHookIndex++;
    const hooks = getComponentHooks(compId);
    if (hooks.length <= idx) {
      hooks[idx] = { current: initialValue };
    }
    return hooks[idx];
  }

  function useMemo(factory, deps) {
    const compId = currentComponentId;
    const idx = currentHookIndex++;
    const hooks = getComponentHooks(compId);
    if (hooks.length <= idx || depsChanged(hooks[idx].deps, deps)) {
      hooks[idx] = { value: factory(), deps };
    }
    return hooks[idx].value;
  }

  function useEffect(effectFn, deps) {
    const compId = currentComponentId;
    const idx = currentHookIndex++;
    const hooks = getComponentHooks(compId);
    const prev = hooks[idx];
    if (!prev || depsChanged(prev.deps, deps)) {
      pendingEffects.push(() => {
        if (prev && typeof prev.cleanup === 'function') {
          try { prev.cleanup(); } catch (e) {}
        }
        const cleanup = effectFn();
        hooks[idx] = { deps, cleanup };
      });
    }
  }

  const SVG_TAGS = new Set([
    'svg', 'path', 'circle', 'rect', 'g', 'polygon', 'polyline', 'line', 'defs', 'linearGradient', 'stop', 'text', 'tspan'
  ]);

  function applyProps(domEl, props, isSvg) {
    Object.keys(props).forEach((key) => {
      if (key === 'children' || key === 'key') return;
      const val = props[key];
      if (key === 'ref') {
        if (typeof val === 'function') val(domEl);
        else if (val && typeof val === 'object') val.current = domEl;
        return;
      }
      if (key === 'className') {
        if (isSvg) domEl.setAttribute('class', val || '');
        else domEl.className = val || '';
        return;
      }
      if (key === 'htmlFor') {
        domEl.setAttribute('for', val);
        return;
      }
      if (key === 'style' && val && typeof val === 'object') {
        Object.keys(val).forEach((sKey) => {
          const sVal = val[sKey];
          if (sVal === undefined || sVal === null) return;
          if (sKey.startsWith('--')) {
            domEl.style.setProperty(sKey, String(sVal));
          } else {
            domEl.style[sKey] = sVal;
          }
        });
        return;
      }
      if (key.startsWith('on') && typeof val === 'function') {
        const evtName = key.slice(2).toLowerCase();
        const mappedEvt = evtName === 'doubleclick' ? 'dblclick' : evtName;
        domEl.addEventListener(mappedEvt, val);
        return;
      }
      if (key === 'checked') {
        domEl.checked = Boolean(val);
        if (val) domEl.setAttribute('checked', '');
        return;
      }
      if (key === 'value' && (domEl.tagName === 'INPUT' || domEl.tagName === 'SELECT' || domEl.tagName === 'TEXTAREA')) {
        domEl.value = String(val ?? '');
        domEl.setAttribute('value', String(val ?? ''));
        return;
      }
      if (val !== undefined && val !== null && val !== false) {
        const attrName = isSvg && key === 'strokeWidth' ? 'stroke-width'
          : isSvg && key === 'strokeLinecap' ? 'stroke-linecap'
          : isSvg && key === 'strokeLinejoin' ? 'stroke-linejoin'
          : isSvg && key === 'fillRule' ? 'fill-rule'
          : isSvg && key === 'clipRule' ? 'clip-rule'
          : key;
        domEl.setAttribute(attrName, val === true ? '' : String(val));
      }
    });
  }

  function renderVNode(vnode, pathId, isSvgContext) {
    if (vnode === null || vnode === undefined || vnode === false || vnode === true) {
      return document.createTextNode('');
    }
    if (typeof vnode === 'string' || typeof vnode === 'number') {
      return document.createTextNode(String(vnode));
    }
    if (Array.isArray(vnode)) {
      const frag = document.createDocumentFragment();
      vnode.forEach((child, i) => {
        frag.appendChild(renderVNode(child, `${pathId}.${i}`, isSvgContext));
      });
      return frag;
    }
    if (vnode.type === Fragment || vnode.type === StrictMode) {
      const frag = document.createDocumentFragment();
      const children = (vnode.props && vnode.props.children) || [];
      children.forEach((child, i) => {
        frag.appendChild(renderVNode(child, `${pathId}.f${i}`, isSvgContext));
      });
      return frag;
    }
    if (typeof vnode.type === 'function') {
      const prevCompId = currentComponentId;
      const prevHookIdx = currentHookIndex;
      const compName = vnode.type.name || 'Anon';
      currentComponentId = `${pathId}:${compName}`;
      currentHookIndex = 0;
      const rendered = vnode.type(vnode.props || {});
      currentComponentId = prevCompId;
      currentHookIndex = prevHookIdx;
      return renderVNode(rendered, currentComponentId || `${pathId}:${compName}`, isSvgContext);
    }

    const tagName = String(vnode.type);
    const isSvg = isSvgContext || SVG_TAGS.has(tagName);
    const domEl = isSvg
      ? document.createElementNS('http://www.w3.org/2000/svg', tagName)
      : document.createElement(tagName);

    const props = vnode.props || {};
    const children = props.children || [];
    children.forEach((child, i) => {
      domEl.appendChild(renderVNode(child, `${pathId}/${tagName}[${i}]`, isSvg));
    });
    applyProps(domEl, props, isSvg);
    return domEl;
  }

  function createRoot(container) {
    let rootVNode = null;
    const performRender = () => {
      if (!rootVNode) return;
      isRendering = true;
      renderQueued = false;
      const scrollX = window.scrollX;
      const scrollY = window.scrollY;
      const domTree = renderVNode(rootVNode, 'root', false);
      container.innerHTML = '';
      container.appendChild(domTree);
      window.scrollTo(scrollX, scrollY);
      isRendering = false;

      const effectsToRun = pendingEffects.slice();
      pendingEffects = [];
      effectsToRun.forEach((ef) => ef());

      if (renderQueued) {
        performRender();
      }
    };

    rootRenderer = performRender;
    return {
      render(vnode) {
        rootVNode = vnode;
        performRender();
      },
    };
  }

  global.React = {
    createElement,
    Fragment,
    StrictMode,
    useState,
    useEffect,
    useMemo,
    useRef,
  };
  global.useState = useState;
  global.useEffect = useEffect;
  global.useMemo = useMemo;
  global.useRef = useRef;
  global.createRoot = createRoot;
})(window);
