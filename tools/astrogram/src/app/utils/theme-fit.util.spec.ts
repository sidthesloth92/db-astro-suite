import { measureTextOverflow } from './theme-fit.util';

/** Builds a fixed-size theme root with the given inner HTML, attached to the page. */
function mount(html: string, width = 200, height = 100): HTMLElement {
  const root = document.createElement('div');
  root.style.cssText = `position:absolute;left:0;top:0;width:${width}px;height:${height}px;font:16px/20px monospace;`;
  root.innerHTML = html;
  document.body.appendChild(root);
  return root;
}

describe('measureTextOverflow', () => {
  const roots: HTMLElement[] = [];
  const make = (html: string, w?: number, h?: number): HTMLElement => {
    const r = mount(html, w, h);
    roots.push(r);
    return r;
  };
  afterEach(() => roots.splice(0).forEach((r) => r.remove()));

  it('should report 1 when all text fits', () => {
    expect(measureTextOverflow(make('<p style="margin:0">fits</p>'))).toBe(1);
  });

  it('should report how far text runs below the root', () => {
    // Ten 20px lines in a 100px box: text reaches twice the box height.
    const lines = Array.from({ length: 10 }, () => '<div>line</div>').join('');
    expect(measureTextOverflow(make(lines))).toBeCloseTo(2, 1);
  });

  it('should count text clipped inside a panel even when the panel fits the root', () => {
    const root = make(
      '<div style="height:40px;overflow:hidden"><div>a</div><div>b</div><div>c</div><div>d</div></div>',
    );
    expect(measureTextOverflow(root)).toBeCloseTo(2, 1);
  });

  it('should count a bordered panel holding text that runs past the root, even when its text fits', () => {
    const root = make('<div style="height:200px;border:1px solid red"><span>ok</span></div>');
    expect(measureTextOverflow(root)).toBeCloseTo(2, 1);
  });

  it('should ignore decorative boxes that bleed past the edge without text', () => {
    const root = make('<div style="position:absolute;top:0;height:400px;width:400px"></div><span>ok</span>');
    expect(measureTextOverflow(root)).toBe(1);
  });

  it('should report a line that may not wrap running past the right edge', () => {
    const root = make('<div style="white-space:nowrap">' + 'x'.repeat(50) + '</div>');
    expect(measureTextOverflow(root)).toBeGreaterThan(1.5);
  });
});
