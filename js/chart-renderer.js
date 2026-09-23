/**
 * OrgFlow Native D3 Hierarchy Engine
 * Pure D3 v7 Tree Layout with smooth zoom, pan, expand/collapse, card rendering, and animations
 * Zero external plugin dependencies - 100% reliable across all browsers and file:/// protocol
 */

class OrgChartRenderer {
  constructor(options = {}) {
    this.containerSelector = options.container || '#chart-container';
    this.data = [];
    this.root = null;
    this.svg = null;
    this.g = null;
    this.zoom = null;
    this.nodeWidth = 280;
    this.nodeHeight = 160;
    this.gapX = 320;
    this.gapY = 230;
    this.highlightedId = null;

    this.onNodeClick = options.onNodeClick || (() => {});
    this.onAddSubordinate = options.onAddSubordinate || (() => {});
    this.onEditNode = options.onEditNode || (() => {});
    this.onDeleteNode = options.onDeleteNode || (() => {});

    // Modern Department Color Themes
    this.departmentThemes = {
      'Executive Board': { bg: 'from-purple-600 to-indigo-600', badge: 'bg-purple-100 text-purple-700 border-purple-200', border: '#7c3aed', solid: '#7c3aed' },
      'Technology': { bg: 'from-blue-600 to-cyan-600', badge: 'bg-blue-100 text-blue-700 border-blue-200', border: '#2563eb', solid: '#2563eb' },
      'Marketing': { bg: 'from-pink-600 to-rose-500', badge: 'bg-pink-100 text-pink-700 border-pink-200', border: '#db2777', solid: '#db2777' },
      'Finance': { bg: 'from-amber-500 to-orange-500', badge: 'bg-amber-100 text-amber-700 border-amber-200', border: '#d97706', solid: '#d97706' },
      'Human Resources': { bg: 'from-emerald-600 to-teal-600', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200', border: '#059669', solid: '#059669' },
      'Operations': { bg: 'from-slate-600 to-zinc-600', badge: 'bg-slate-100 text-slate-700 border-slate-200', border: '#475569', solid: '#475569' },
      'Sales': { bg: 'from-violet-600 to-purple-500', badge: 'bg-violet-100 text-violet-700 border-violet-200', border: '#7c3aed', solid: '#7c3aed' },
      'General': { bg: 'from-sky-600 to-blue-500', badge: 'bg-sky-100 text-sky-700 border-sky-200', border: '#0284c7', solid: '#0284c7' }
    };
  }

  getDepartmentTheme(dept) {
    if (!dept) return this.departmentThemes['General'];
    const matchedKey = Object.keys(this.departmentThemes).find(
      key => dept.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(dept.toLowerCase())
    );
    return matchedKey ? this.departmentThemes[matchedKey] : this.departmentThemes['General'];
  }

  getInitials(name) {
    if (!name) return 'EMP';
    const parts = name.replace(/^(ดร\.|นาย|นาง|นางสาว|คุณ)\s*/g, '').trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  /**
   * Main Render method
   */
  render(data) {
    this.data = data || [];
    const container = document.querySelector(this.containerSelector);
    if (!container) return;

    // Clear container
    container.innerHTML = '';

    if (!this.data || this.data.length === 0) {
      container.innerHTML = `
        <div class="flex flex-col items-center justify-center h-full text-slate-400">
          <i class="fa-solid fa-sitemap text-5xl mb-3 text-slate-300"></i>
          <p class="text-sm font-semibold text-slate-600">ไม่มีข้อมูลโครงสร้างองค์กร</p>
          <p class="text-xs text-slate-400 mt-1">อัพโหลดไฟล์ Excel หรือกด "โหลดตัวอย่างตั้งต้น" เพื่อเริ่มต้น</p>
        </div>
      `;
      return;
    }

    // Build hierarchy tree
    this.buildHierarchy();
    if (!this.root) return;

    // Setup SVG and Zoom Canvas
    this.setupCanvas(container);

    // Render tree nodes and links
    this.update(this.root);

    // Initial Auto-Fit to Screen after short layout tick
    setTimeout(() => this.fit(), 80);
  }

  /**
   * Convert flat dataset into D3 Hierarchy
   */
  buildHierarchy() {
    try {
      const items = this.data.map(d => ({
        ...d,
        id: String(d.id).trim(),
        reportsTo: d.reportsTo ? String(d.reportsTo).trim() : ''
      }));

      // Find root node(s)
      const roots = items.filter(d => !d.reportsTo);

      let stratifyData = items;
      let rootId = roots.length > 0 ? roots[0].id : items[0].id;

      if (roots.length === 0) {
        items[0].reportsTo = '';
        rootId = items[0].id;
      } else if (roots.length > 1) {
        // Multiple roots: connect to virtual root
        stratifyData = [
          { id: '__VIRTUAL_ROOT__', reportsTo: '', name: 'Organization', position: 'Company', department: 'Executive Board' },
          ...items.map(d => ({
            ...d,
            reportsTo: !d.reportsTo ? '__VIRTUAL_ROOT__' : d.reportsTo
          }))
        ];
        rootId = '__VIRTUAL_ROOT__';
      }

      const stratify = d3.stratify()
        .id(d => d.id)
        .parentId(d => d.reportsTo);

      const hierarchyRoot = stratify(stratifyData);

      // Pre-collapse deep nodes if tree is very large (> 30 nodes)
      if (stratifyData.length > 30) {
        hierarchyRoot.descendants().forEach(d => {
          if (d.depth >= 3 && d.children) {
            d._children = d.children;
            d.children = null;
          }
        });
      }

      this.root = hierarchyRoot;
    } catch (err) {
      console.error('Stratify error:', err);
      // Fallback hierarchy
      this.root = d3.hierarchy(this.data[0]);
    }
  }

  /**
   * Setup SVG Container with Zoom & Pan Behaviors
   */
  setupCanvas(container) {
    const width = container.clientWidth || 1200;
    const height = container.clientHeight || 800;

    this.svg = d3.select(this.containerSelector)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('class', 'w-full h-full select-none')
      .style('cursor', 'grab');

    // Add SVG definitions (Drop shadows, marker arrows)
    const defs = this.svg.append('defs');
    defs.append('filter')
      .attr('id', 'card-shadow')
      .attr('x', '-10%')
      .attr('y', '-10%')
      .attr('width', '130%')
      .attr('height', '130%')
      .html(`
        <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#0f172a" flood-opacity="0.08" />
      `);

    // Master zoom container group
    this.g = this.svg.append('g').attr('class', 'org-canvas-root');

    // Container layers: links layer below, nodes layer above
    this.gLinks = this.g.append('g').attr('class', 'links-layer');
    this.gNodes = this.g.append('g').attr('class', 'nodes-layer');

    // D3 Zoom Setup
    this.zoom = d3.zoom()
      .scaleExtent([0.15, 2.5])
      .on('zoom', (event) => {
        this.g.attr('transform', event.transform);
      });

    this.svg.call(this.zoom);

    // Double click to zoom disabled for better card interaction
    this.svg.on('dblclick.zoom', null);
  }

  /**
   * Layout Calculation & SVG Tree Update
   */
  update(source) {
    if (!this.root) return;

    // Tree Layout generator with generous spacing
    const treeLayout = d3.tree()
      .nodeSize([this.gapX, this.gapY])
      .separation((a, b) => (a.parent === b.parent ? 1.05 : 1.15));

    treeLayout(this.root);

    const nodes = this.root.descendants().filter(d => d.data.id !== '__VIRTUAL_ROOT__');
    const links = this.root.links().filter(l => l.source.data.id !== '__VIRTUAL_ROOT__');

    // ----------------------------------------------------
    // 1. RENDER LINKS (Orthogonal Step Connectors)
    // ----------------------------------------------------
    const linkSelection = this.gLinks.selectAll('.org-link')
      .data(links, d => `${d.source.data.id}->${d.target.data.id}`);

    // Enter Links
    const linkEnter = linkSelection.enter()
      .append('path')
      .attr('class', 'org-link')
      .attr('fill', 'none')
      .attr('stroke', '#cbd5e1')
      .attr('stroke-width', 2)
      .attr('stroke-linecap', 'round')
      .attr('stroke-linejoin', 'round')
      .attr('d', d => this.generateConnectorPath(d));

    // Update Links
    linkSelection.merge(linkEnter)
      .transition()
      .duration(350)
      .attr('stroke', d => (this.highlightedId && (d.source.data.id === this.highlightedId || d.target.data.id === this.highlightedId) ? '#6366f1' : '#cbd5e1'))
      .attr('stroke-width', d => (this.highlightedId && (d.source.data.id === this.highlightedId || d.target.data.id === this.highlightedId) ? 3 : 2))
      .attr('d', d => this.generateConnectorPath(d));

    // Exit Links
    linkSelection.exit().remove();

    // ----------------------------------------------------
    // 2. RENDER NODES (HTML Cards in foreignObject)
    // ----------------------------------------------------
    const nodeSelection = this.gNodes.selectAll('.org-node-group')
      .data(nodes, d => d.data.id);

    // Enter Nodes
    const nodeEnter = nodeSelection.enter()
      .append('g')
      .attr('class', 'org-node-group')
      .attr('transform', d => `translate(${d.x - this.nodeWidth / 2}, ${d.y})`)
      .style('opacity', 0);

    // ForeignObject for Modern Tailwind HTML Card
    const foreignObj = nodeEnter.append('foreignObject')
      .attr('width', this.nodeWidth)
      .attr('height', this.nodeHeight + 35) // extra height for expand/collapse badge
      .style('overflow', 'visible');

    foreignObj.html(d => this.generateCardHtml(d));

    // Update Nodes
    const nodeUpdate = nodeSelection.merge(nodeEnter);
    nodeUpdate.transition()
      .duration(350)
      .style('opacity', 1)
      .attr('transform', d => `translate(${d.x - this.nodeWidth / 2}, ${d.y})`);

    // Re-render HTML on update
    nodeUpdate.select('foreignObject')
      .html(d => this.generateCardHtml(d));

    // Exit Nodes
    nodeSelection.exit()
      .transition()
      .duration(250)
      .style('opacity', 0)
      .remove();
  }

  /**
   * Generates elegant step connector paths between cards
   */
  generateConnectorPath(d) {
    const startX = d.source.x;
    const startY = d.source.y + this.nodeHeight;
    const endX = d.target.x;
    const endY = d.target.y;
    const midY = startY + (endY - startY) / 2;

    return `M ${startX} ${startY} V ${midY} H ${endX} V ${endY}`;
  }

  /**
   * Generates the Card HTML with Tailwind styling and interactive badges
   */
  generateCardHtml(node) {
    const data = node.data;
    const theme = this.getDepartmentTheme(data.department);
    const initials = this.getInitials(data.name);
    const roleLevel = data.roleLevel || 'Staff';
    const isHighlighted = this.highlightedId === data.id;

    // Children count & collapse state
    const hasChildren = (node.children && node.children.length > 0) || (node._children && node._children.length > 0);
    const totalSubordinates = (node.children ? node.children.length : 0) + (node._children ? node._children.length : 0);
    const isCollapsed = Boolean(node._children);

    // Role badge color style
    let levelBadgeStyle = 'bg-slate-100 text-slate-600 border-slate-200';
    if (roleLevel.toLowerCase().includes('c-level') || roleLevel.toLowerCase().includes('ceo') || roleLevel.toLowerCase().includes('cto') || roleLevel.toLowerCase().includes('cfo')) {
      levelBadgeStyle = 'bg-purple-100 text-purple-800 border-purple-300 font-bold';
    } else if (roleLevel.toLowerCase().includes('director') || roleLevel.toLowerCase().includes('vp') || roleLevel.toLowerCase().includes('head')) {
      levelBadgeStyle = 'bg-indigo-100 text-indigo-700 border-indigo-200 font-semibold';
    } else if (roleLevel.toLowerCase().includes('manager') || roleLevel.toLowerCase().includes('lead')) {
      levelBadgeStyle = 'bg-blue-100 text-blue-700 border-blue-200 font-medium';
    }

    const avatarHtml = data.avatarUrl ? `
      <img src="${data.avatarUrl}" alt="${data.name}" class="w-11 h-11 rounded-full object-cover shadow-xs border-2 border-white ring-2 ring-slate-100" onerror="this.outerHTML='<div class=\\'w-11 h-11 rounded-full bg-gradient-to-tr ${theme.bg} text-white flex items-center justify-center font-bold text-xs shadow-xs border-2 border-white\\'>${initials}</div>'" />
    ` : `
      <div class="w-11 h-11 rounded-full bg-gradient-to-tr ${theme.bg} text-white flex items-center justify-center font-bold text-xs shadow-xs border-2 border-white ring-2 ring-slate-100">
        ${initials}
      </div>
    `;

    return `
      <div class="relative w-[${this.nodeWidth}px] h-[${this.nodeHeight}px] group select-none">
        
        <!-- Main Card Box -->
        <div class="w-full h-full bg-white rounded-2xl border transition-all duration-300 overflow-hidden cursor-pointer flex flex-col justify-between ${
          isHighlighted
            ? 'shadow-2xl border-indigo-500 ring-4 ring-indigo-500/20'
            : 'shadow-sm hover:shadow-xl border-slate-200/90'
        }"
        onclick="window.OrgApp.handleNodeClick('${data.id}')">

          <!-- Department Top Gradient Accent Bar -->
          <div class="h-2 w-full bg-gradient-to-r ${theme.bg}"></div>

          <!-- Card Inner Content -->
          <div class="p-3 flex-1 flex flex-col justify-between">
            
            <!-- Top Row: Avatar & Text -->
            <div class="flex items-start gap-2.5">
              <div class="flex-shrink-0">
                ${avatarHtml}
              </div>

              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between gap-1 mb-0.5">
                  <span class="text-[9px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full border ${theme.badge} truncate max-w-[100px]">
                    ${data.department || 'General'}
                  </span>
                  <span class="text-[9px] px-1.5 py-0.2 rounded border ${levelBadgeStyle} truncate">
                    ${roleLevel}
                  </span>
                </div>
                
                <h3 class="font-bold text-slate-800 text-[13px] leading-tight truncate" title="${data.name}">
                  ${data.name}
                </h3>
                <p class="text-[11px] font-medium text-slate-500 truncate" title="${data.position}">
                  ${data.position}
                </p>
              </div>
            </div>

            <!-- Bottom Row: ID and Action Tool Icons -->
            <div class="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span class="font-mono text-[10px] text-slate-400 font-semibold">#${data.id}</span>
              
              <div class="flex items-center gap-1" onclick="event.stopPropagation()">
                <button title="เพิ่มลูกน้องใต้สายงาน"
                        class="p-1 rounded-md text-emerald-600 hover:bg-emerald-50 hover:scale-110 transition-all"
                        onclick="window.OrgApp.openAddSubordinateModal('${data.id}')">
                  <i class="fa-solid fa-user-plus text-[11px]"></i>
                </button>
                <button title="แก้ไขข้อมูล"
                        class="p-1 rounded-md text-blue-600 hover:bg-blue-50 hover:scale-110 transition-all"
                        onclick="window.OrgApp.openEditModal('${data.id}')">
                  <i class="fa-solid fa-pen text-[11px]"></i>
                </button>
                <button title="ดูรายละเอียด"
                        class="p-1 rounded-md text-slate-500 hover:text-indigo-600 hover:bg-slate-100 transition-all"
                        onclick="window.OrgApp.openDetailModal('${data.id}')">
                  <i class="fa-solid fa-circle-info text-[11px]"></i>
                </button>
              </div>
            </div>

          </div>
        </div>

        <!-- Expand / Collapse Subordinate Counter Pill Badge -->
        ${hasChildren ? `
          <div class="absolute -bottom-3.5 left-1/2 -translate-x-1/2 z-20" onclick="event.stopPropagation()">
            <button onclick="window.OrgApp.toggleNodeChildren('${data.id}')"
                    title="${isCollapsed ? 'คลิกเพื่อขยายสายงาน' : 'คลิกเพื่อยุบสายงาน'}"
                    class="px-2.5 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 shadow-sm transition-all duration-200 ${
                      isCollapsed
                        ? 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600 ring-2 ring-indigo-200'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
                    }">
              <span>${isCollapsed ? '+' : '-'}</span>
              <span>${totalSubordinates}</span>
            </button>
          </div>
        ` : ''}

      </div>
    `;
  }

  /**
   * Toggle Children Collapse / Expand for a specific node ID
   */
  toggleNode(nodeId) {
    if (!this.root) return;
    const node = this.root.descendants().find(d => d.data.id === nodeId);
    if (!node) return;

    if (node.children) {
      node._children = node.children;
      node.children = null;
    } else if (node._children) {
      node.children = node._children;
      node._children = null;
    }

    this.update(node);
  }

  /**
   * Expand All Branches
   */
  expandAll() {
    if (!this.root) return;
    this.root.descendants().forEach(d => {
      if (d._children) {
        d.children = d._children;
        d._children = null;
      }
    });
    this.update(this.root);
    setTimeout(() => this.fit(), 150);
  }

  /**
   * Collapse All Branches (Keep top 2 levels open)
   */
  collapseAll() {
    if (!this.root) return;
    this.root.descendants().forEach(d => {
      if (d.depth >= 1 && d.children) {
        d._children = d.children;
        d.children = null;
      }
    });
    this.update(this.root);
    setTimeout(() => this.fit(), 150);
  }

  /**
   * Center and Fit the entire Chart into the Viewport
   */
  fit() {
    if (!this.svg || !this.root) return;
    const container = document.querySelector(this.containerSelector);
    if (!container) return;

    const width = container.clientWidth || 1200;
    const height = container.clientHeight || 800;

    const nodes = this.root.descendants().filter(d => d.data.id !== '__VIRTUAL_ROOT__');
    if (nodes.length === 0) return;

    // Calculate bounds of visible nodes
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    nodes.forEach(d => {
      if (d.x < minX) minX = d.x;
      if (d.x > maxX) maxX = d.x;
      if (d.y < minY) minY = d.y;
      if (d.y > maxY) maxY = d.y;
    });

    const treeWidth = (maxX - minX) + this.nodeWidth + 80;
    const treeHeight = (maxY - minY) + this.nodeHeight + 100;

    const scaleX = width / treeWidth;
    const scaleY = height / treeHeight;
    const scale = Math.min(Math.max(Math.min(scaleX, scaleY) * 0.9, 0.25), 1.2);

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    const transform = d3.zoomIdentity
      .translate(width / 2, height / 2)
      .scale(scale)
      .translate(-centerX, -centerY);

    this.svg.transition()
      .duration(600)
      .call(this.zoom.transform, transform);
  }

  /**
   * Zoom In Step
   */
  zoomIn() {
    if (this.svg && this.zoom) {
      this.svg.transition().duration(300).call(this.zoom.scaleBy, 1.25);
    }
  }

  /**
   * Zoom Out Step
   */
  zoomOut() {
    if (this.svg && this.zoom) {
      this.svg.transition().duration(300).call(this.zoom.scaleBy, 0.8);
    }
  }

  /**
   * Focus, pan and highlight a specific node card
   */
  focusNode(nodeId) {
    if (!this.root || !this.svg) return;

    // Expand ancestor path to ensure target node is visible
    let targetNode = null;
    this.root.descendants().forEach(d => {
      if (d.data.id === nodeId) {
        targetNode = d;
      }
    });

    if (!targetNode) {
      // Might be inside collapsed branch: expand all ancestors
      let current = this.data.find(d => d.id === nodeId);
      const ancestorIds = new Set();
      while (current && current.reportsTo) {
        ancestorIds.add(current.reportsTo);
        current = this.data.find(d => d.id === current.reportsTo);
      }
      this.root.descendants().forEach(d => {
        if (ancestorIds.has(d.data.id) && d._children) {
          d.children = d._children;
          d._children = null;
        }
      });
      this.update(this.root);
      targetNode = this.root.descendants().find(d => d.data.id === nodeId);
    }

    if (!targetNode) return;

    this.highlightedId = nodeId;
    this.update(targetNode);

    const container = document.querySelector(this.containerSelector);
    const width = container.clientWidth || 1200;
    const height = container.clientHeight || 800;

    const transform = d3.zoomIdentity
      .translate(width / 2, height / 3)
      .scale(1.05)
      .translate(-targetNode.x, -targetNode.y);

    this.svg.transition()
      .duration(700)
      .call(this.zoom.transform, transform);
  }

  /**
   * Export Chart as PNG Image
   */
  exportImg() {
    const container = document.querySelector(this.containerSelector);
    if (!container) return;

    // Temporarily fit chart to capture full tree
    this.fit();

    setTimeout(() => {
      if (typeof html2canvas !== 'undefined') {
        html2canvas(container, {
          backgroundColor: '#f8fafc',
          scale: 2,
          logging: false,
          useCORS: true
        }).then(canvas => {
          const link = document.createElement('a');
          link.download = 'OrgChart_Diagram.png';
          link.href = canvas.toDataURL('image/png');
          link.click();
        });
      } else {
        alert('กำลังเตรียมดาวน์โหลดภาพ...');
      }
    }, 650);
  }

  /**
   * Export SVG
   */
  exportSvg() {
    const svgEl = document.querySelector(`${this.containerSelector} svg`);
    if (!svgEl) return;

    const svgData = new XMLSerializer().serializeToString(svgEl);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'OrgChart_Vector.svg';
    link.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Export PDF
   */
  exportPdf() {
    const container = document.querySelector(this.containerSelector);
    if (!container) return;

    this.fit();

    setTimeout(() => {
      if (typeof html2canvas !== 'undefined' && typeof jspdf !== 'undefined') {
        html2canvas(container, {
          backgroundColor: '#ffffff',
          scale: 2,
          useCORS: true
        }).then(canvas => {
          const imgData = canvas.toDataURL('image/jpeg', 0.95);
          const { jsPDF } = jspdf;
          const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [canvas.width, canvas.height] });
          pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height);
          pdf.save('OrgChart_Document.pdf');
        });
      } else {
        window.print();
      }
    }, 650);
  }
}

window.OrgChartRenderer = OrgChartRenderer;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { OrgChartRenderer };
}
