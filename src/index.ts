import * as joint from "jointjs";
import * as dagre from "dagre";
import * as graphlib from "graphlib";

declare var window: any;

window.plantumljs = {
  draw: (el: any, plantuml: string, options: any = {}) => {
    /*
    ^((?<modifier>abstract) )*(?<type>class|interface) (?<name>[^ <]+)(<T( extends [^>]+)?>)? ?(extends (?<extend>[^ ]+) ?)?(implements (?<implements>[^{]+))? ?{?\n(\W(?<content>[\w\W]+?)^}$)?
    */
    // PlantUML parser regexp
    const parser = /^((?<modifier>abstract) )*(?<type>class|interface) (?<name>[^ <]+)(<T( extends [^>]+)?>)? ?(extends (?<extend>[^ ]+) ?)?(implements (?<implements>[^{]+))? ?{?\n(\W(?<content>[\w\W]+?)^}$)?/gm;

    var graph = new joint.dia.Graph();
    // @ts-ignore
    var CustomLinkView = joint.dia.LinkView.extend({
      contextmenu: function (evt, x, y) {
        this.addLabel(x, y, 45, {
          absoluteDistance: true,
          reverseDistance: true, // applied only when absoluteDistance is set
          absoluteOffset: true,
          keepGradient: true,
          ensureLegibility: true // applied only when keepGradient is set
        });
      },
      pointerdblclick: function (evt, x, y) {
        console.log("dbl clk");
        this.addLabel(x, y);
      }
    });

    let paper = new joint.dia.Paper({
      // @ts-ignore
      el,
      width: "100vw",
      height: "100vh",
      gridSize: 30,
      model: graph,
      preventContextMenu: false,
      linkView: CustomLinkView,
      interactive: {
        arrowheadMove: false,
        addLinkFromMagnet: false,
        linkMove: false,
        labelMove: false,
        vertexMove: false,
        vertexAdd: false,
        vertexRemove: false,
        useLinkTools: false
      }
    });

    /**
     * Implement drag and drop
     */
    var dragging: { x: number; y: number } = undefined;

    // @ts-ignore
    paper.on("blank:pointerdown", ({ screenX: x, screenY: y }) => {
      dragging = { x, y };
    });
    // @ts-ignore
    paper.on("blank:pointerup", () => {
      dragging = undefined;
    });
    // @ts-ignore
    paper.on("blank:pointermove", ({ screenX: x, screenY: y }) => {
      if (dragging) {
        let cur = paper.translate();
        paper.translate(cur.tx - dragging.x + x, cur.ty - dragging.y + y);
        dragging = { x, y };
      }
    });

    /**
     * Implement zoom
     */
    // @ts-ignore
    paper.$el.on("mousewheel DOMMouseScroll", onMouseWheel);

    var currentZoom = 1.0;

    function onMouseWheel(e: any) {
      e.preventDefault();
      e = e.originalEvent;

      var delta = Math.max(-1, Math.min(1, e.wheelDelta || -e.detail)) / 50;
      //console.log(delta, V(paper.viewport).scale().sx + delta);
      currentZoom += delta;

      if (currentZoom > 0.4 && currentZoom < 2) {
        let cur = paper.translate();
        console.log(cur);
        //paper.setOrigin(0, 0);
        //paper.translate(cur.tx * currentZoom, cur.ty * currentZoom); // reset the previous viewport translation
        paper.scale(currentZoom);
        /*
        if (delta < 0) {
        paper.scale(currentZoom, currentZoom, cur.tx / delta, cur.ty / delta);
        } else {
        paper.scale(currentZoom, currentZoom, cur.tx * delta, cur.ty * delta);
        }
        */
      }
    }

    function offsetToLocalPoint(x, y) {
      // @ts-ignore
      var svgPoint = paper.svg.createSVGPoint();
      svgPoint.x = x;
      svgPoint.y = y;
      // Transform point into the viewport coordinate system.
      var pointTransformed = svgPoint.matrixTransform(paper.viewport.getCTM().inverse());
      return pointTransformed;
    }

    var currentView;

    function getGlobalEvent(evt, el, x, y) {
      let target = evt.target;
      while (target && target.parentElement.tagName !== "g") {
        target = target.parentElement;
      }
      if (!target) {
        return;
      }
      let info;
      if (target.className.baseVal.startsWith("uml-class-name-")) {
        info = {
          type: "class"
        };
      } else if (target.className.baseVal.startsWith("uml-class-attrs")) {
        info = {
          type: "attribute"
        };
      } else if (target.className.baseVal.startsWith("uml-class-methods")) {
        info = {
          type: "method"
        };
      }
      if (el) {
        let relativeY = evt.offsetY - el.attributes.position.y;
        let fullHeight = 0;
        for (let i in el.attributes.attrs) {
          if (i.endsWith("-rect")) {
            fullHeight += el.attributes.attrs[i].height;
          }
        }
        let absoluteY = relativeY / (el.attributes.size.height / fullHeight);
        if (info.type === "attribute") {
          absoluteY -= el.attributes.attrs[".uml-class-name-rect"].height;
          info.attribute =
            el.attributes.attributes[
              Math.floor(
                absoluteY / (el.attributes.attrs[".uml-class-attrs-rect"].height / el.attributes.attributes.length)
              )
            ];
        } else if (info.type === "method") {
          absoluteY -=
            el.attributes.attrs[".uml-class-name-rect"].height + el.attributes.attrs[".uml-class-attrs-rect"].height;
          info.method =
            el.attributes.methods[
              Math.floor(
                absoluteY / (el.attributes.attrs[".uml-class-attrs-rect"].height / el.attributes.methods.length)
              )
            ];
        }
      }
      return {
        name: el.attributes.name,
        ...info
      };
    }

    // @ts-ignore
    paper.on("element:pointerclick", function (view, evt, x, y) {
      evt.stopPropagation();
      if (currentView) {
        currentView.unhighlight();
      }
      view.highlight();
      currentView = view;
      let el = graph.findModelsFromPoint({ x, y }).pop();
      console.log(getGlobalEvent(evt, el, x, y));
    });

    var uml = joint.shapes.uml;

    var roots = {};
    var defs: any = {};
    var i = 0;
    [...plant.matchAll(parser)].forEach(array1 => {
      let methods = [];
      let attributes = [];
      if (i++ !== 11) {
        //continue;
      }
      let width = 200;
      console.log(array1);
      if (array1.groups.content) {
        array1.groups.content
          .split("\n")
          .map(i => i.trim())
          .filter(l => l.length)
          .forEach(line => {
            width = Math.max(width, line.length * 5 + 30);
            if (line.split(":").shift().indexOf("(") >= 0) {
              methods.push(line);
            } else {
              attributes.push(line);
            }
          });
      }
      let type;
      let implementations = [];
      if (array1.groups.implements) {
        implementations = array1.groups.implements.split(",").map(i => i.trim());
      }
      if (array1.groups.type === "class") {
        console.log(array1.groups);
        if (array1.groups.modifier === "abstract") {
          type = "Abstract";
        } else {
          type = "Class";
        }
      } else if (array1.groups.type === "interface") {
        type = "Interface";
      }
      // Move to abstract for some
      defs[array1.groups.name] = new uml[type]({
        position: { x: 0, y: 10 },
        size: { width, height: 50 + (methods.length + attributes.length) * 12 },
        name: array1.groups.name,
        methods,
        attributes,
        infos: { ...array1.groups, implementations },
        parents: [],
        children: [],
        subtreeWidth: function (def) {
          return Math.max(
            def.attributes.size.width,
            def.attributes.children.reduce((prev, def) => prev + def.attributes.subtreeWidth(def), 0)
          );
        },
        attrs: {
          ".uml-class-name-rect": {
            fill: "#ff8450",
            stroke: "#fff",
            "stroke-width": 0.5
          },
          ".uml-class-attrs-rect": {
            fill: "#fe976a",
            stroke: "#fff",
            "stroke-width": 0.5
          },
          ".uml-class-methods-rect": {
            fill: "#fe976a",
            stroke: "#fff",
            "stroke-width": 0.5
          },
          ".uml-class-methods-text": {
            "ref-y": 0.5,
            "y-alignment": "middle"
          }
        }
      });
      if (!implementations.length && !array1.groups.extend) {
        roots[array1.groups.name] = defs[array1.groups.name];
      }
    });

    // Build tree
    Object.values(defs).forEach((def: any) => {
      let infos = def.attributes.infos;
      let parents = [...infos.implementations.map(name => ({ name, type: "interface" }))];
      if (infos.extend) {
        parents.push({ name: infos.extend, type: "class" });
      }
      parents.forEach(({ name: parent, type }) => {
        if (defs[parent]) {
          defs[parent].attributes.children = defs[parent].attributes.children || [];
        } else {
          defs[parent] = new uml.Class({
            position: { x: 0, y: 10 },
            size: { width: 200, height: 50 },
            name: parent,
            methods: [],
            attributes: [],
            infos: {},
            parents: [],
            children: [],
            subtreeWidth: function (def) {
              return Math.max(
                def.attributes.size.width,
                def.attributes.children.reduce((prev, def) => prev + def.attributes.subtreeWidth(def), 0)
              );
            },
            attrs: {
              ".uml-class-name-rect": {
                fill: "#999",
                stroke: "#fff",
                "stroke-width": 0.5
              },
              ".uml-class-attrs-rect": {
                fill: "#999",
                stroke: "#fff",
                "stroke-width": 0.5
              },
              ".uml-class-methods-rect": {
                fill: "#999",
                stroke: "#fff",
                "stroke-width": 0.5
              },
              ".uml-class-methods-text": {
                "ref-y": 0.5,
                "y-alignment": "middle"
              }
            }
          });
        }
        defs[parent].attributes.children.push(def);
        def.attributes.parents.push({ type, name: parent, found: defs[parent] });
      });
    });

    Object.values(defs).forEach(function (def: any) {
      graph.addCell(def);
    });

    // Create relations
    Object.values(defs).forEach((def: any) => {
      def.attributes.parents.forEach(({ type, name: parent }) => {
        if (type === "interface") {
          graph.addCell(new uml.Implementation({ source: { id: def.id }, target: { id: defs[parent].id } }));
        } else {
          graph.addCell(new uml.Generalization({ source: { id: def.id }, target: { id: defs[parent].id } }));
        }
      });
    });

    var graphBBox = joint.layout.DirectedGraph.layout(graph, {
      nodeSep: 50,
      edgeSep: 80,
      rankDir: "TB",
      dagre,
      graphlib
    });
  }
};
