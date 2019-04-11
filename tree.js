/**
 * Created by zsxj-515 on 2019/4/9.
 */
(function (d3) {
    /**
     * 只局限于svg中的操作
     */
    var options = {
        workflow: {
            nodes: [],
            lines: []
        },
        svg: d3.select("svg")

    };

    var workflow = {
        nodes: [],
        lines: []
    };

    //拖动的变量
    var dx = 0;
    var dy = 0;
    var dragElem = null;

    //线的变量
    var activeLine = null;
    var points = [];
    var translate = [0, 0];
    var drawLine = false;
    var banAddLine = false;//禁止增加连线

    //sql结果
    var sqlRes = "";

    var api = {
        config: function (ops) {
            //没有参数传入，直接返回默认参数
            if (!opts) return options;
            //有参数传入，通过key将options的值更新为用户的值
            for (var key in opts) {
                options[key] = opts[key];
            }
            return this;
        },
        listen: function listen(elem) {
            //这里通过typeof设置监听的元素需为字符串调用，实际可根据需要进行更改
            if (typeof elem === 'string') {
                //这里使用ES5的querySelectorAll方法获取dom元素
                var elems = document.querySelectorAll(elem),
                    i = elems.length;
                //通过递归将listen方法应用在所有的dom元素上
                while (i--) {
                    listen(elems[i]);
                }
                return
            }
            //在这里，你可以将插件的部分功能函数写在这里

            return this;
        },
        setWorkflow: function (data) {
            workflow = data;
        },
        getWorkflow: function () {
            return workflow;
        },
        //1.增加节点，回传json数据
        addNode: function (svg, node) {
            var that = this;
            var g = svg.append("g")
                .attr("class", "node")
                .attr("data-id", node.dataId)
                .attr("id", node.id)
                .attr("transform", 'translate(' + node.x + ', ' + node.y + ')')
                .on("click", function () {
                    d3.select(this).append("circle")
                        .attr("class", "deleteNode")
                        .attr("cx", 0)
                        .attr("cy", 0)
                        .attr("r", 10)
                        .attr("stroke", "#000")
                        .attr("nodeId", d3.select(this).attr("id"))
                        .attr("fill", "url(#deleteLine)")
                        .on("click", function () {
                            var nodeId = d3.select(this).attr("nodeId");

                            //删除数据集中对应参数(自身+线+父节点childrenMsg中对应的值)
                            for (var i = workflow.lines.length - 1; i >= 0; i--) {
                                if (workflow.lines[i].startId == nodeId) {
                                    d3.select("path[id='" + workflow.lines[i].id + "']").remove();
                                    workflow.lines.splice(i, 1);
                                    continue;
                                }
                                //作为入口，删除与父节点关联的线和父节点中childrenMsg中对应的值
                                if (workflow.lines[i].endId == nodeId) {
                                    var startId = workflow.lines[i].startId;
                                    var childernPos = workflow.lines[i].outputPos == 0 ? "left" : "right";
                                    for (var j = workflow.nodes.length - 1; j >= 0; j--) {
                                        if (startId == workflow.nodes[j].id) {
                                            workflow.nodes[j].childrenMsg[childernPos] = "";
                                            break;
                                        }
                                    }
                                    d3.select("path[id='" + workflow.lines[i].id + "']").remove();
                                    workflow.lines.splice(i, 1);
                                }
                            }

                            //删除自身
                            workflow.nodes.forEach(function (e, i) {
                                if (nodeId == e.id) {
                                    d3.select("g[id='" + nodeId + "']").remove();
                                    workflow.nodes.splice(i, 1);
                                    return false;
                                }
                            });

                            this.remove();
                            console.log("workflow:", workflow);
                            d3.event.stopPropagation();
                        });
                    d3.event.stopPropagation();
                });

            var rect = g.append("rect")
                .attr("rx", 5)
                .attr("ry", 5)
                .attr("stroke-width", 2)
                .attr("stroke", "#333")
                .attr("fill", "#fff");

            var bound = rect.node().getBoundingClientRect();
            var width = bound.width;
            var height = bound.height;

            // text 中间文本
            g.append("text")
                .text(node.text)
                .attr("x", width / 2)
                .attr("y", height / 2)
                .attr("dominant-baseline", "central")
                .attr("text-anchor", "middle");

            // left icon
            g.append('text')
                .attr("x", 18)
                .attr("y", height / 2)
                .attr("dominant-baseline", "central")
                .attr("text-anchor", "middle")
                .attr('font-family', 'FontAwesome')
                .text('\uf1c0');

            // right icon
            g.append('text')
                .attr("x", width - 18)
                .attr("y", height / 2)
                .attr("dominant-baseline", "central")
                .attr("text-anchor", "middle")
                .attr('font-family', 'FontAwesome')
                .text('\uf00c');

            // input circle 输入标识
            var inputs = node.inputs || 0;
//        g.attr("inputs", inputs);
            g.append("circle")
                .attr("class", "input")
                .attr("input", 1)
                .attr("cx", width / 2)
                .attr("cy", 0)
                .attr("r", 5);


            // output circle 输出标识
            var outputs = node.outputs || 0;
//        g.attr("outputs", outputs);
            for (i = 0; i < outputs; i++) {
                g.append("circle")
                    .attr("outputPos", 0) //outputPos : 1:左 2：右
                    .attr("class", "output leftOutput")
                    .attr("cx", width / 3)
                    .attr("cy", height)
                    .attr("r", 5);
                g.append("circle")
                    .attr("outputPos", 1)
                    .attr("class", "output rightOutput")
                    .attr("cx", width * 2 / 3)
                    .attr("cy", height)
                    .attr("r", 5);
            }


            g.call(
                d3.drag()
                    .on("start", that.dragstarted)
                    .on("drag", that.dragged)
                    .on("end", that.dragended)
            );

            g.selectAll("circle.output").call(
                d3.drag()
                    .on("start", that.linestarted)
                    .on("drag", that.linedragged)
                    .on("end", that.lineended)
            );

            g.selectAll("circle.input")
                .on("mouseover", function () {
                    if (drawLine) {

                        //判断线数组中fromid=入口
                        var inLineLength = workflow.lines.filter(function (en) {
                            return en.endId == d3.select(this.parentNode).attr("id");
                        }.bind(this)).length;
                        if (inLineLength >= 1) {
                            alert("入口只能连一条线");
                            activeLine.remove();
                            return false;
                        }
                        d3.selectAll("circle.end").classed("end", false);
                        d3.select(this).classed("end", true);


                    }
                });

            return g;
        },
        /**
         * 拖动
         */
        dragstarted: function () {
            var transform = d3.select(this).attr("transform");
            var translate = api.getTranslate(transform);
            dx = d3.event.x - translate[0];
            dy = d3.event.y - translate[1];
            dragElem = d3.select(this);
            //清空删除线按钮
            d3.select(".deleteLine").remove();
        },
        dragged: function () {
            dragElem.attr("transform", "translate(" + (d3.event.x - dx) + ", " + (d3.event.y - dy) + ")");
            api.updateCable(dragElem);
        },
        updateCable: function (elem) {
            var bound = elem.node().getBoundingClientRect();
            var width = bound.width;
            var height = bound.height;
            var id = elem.attr("id");
            var transform = elem.attr("transform");
            var t1 = api.getTranslate(transform);


            // 更新输出线的位置
            d3.selectAll('path[from="' + id + '"]')
                .each(function () {
                    var start = d3.select(this).attr("start").split(",");
                    console.log("start[0]:", start[0]);
                    start[0] = +start[0] + t1[0];
                    start[1] = +start[1] + t1[1];

                    var path = d3.select(this).attr("d");
                    var end = path.substring(path.lastIndexOf(" ") + 1).split(",");
                    end[0] = +end[0];
                    end[1] = +end[1];

                    d3.select(this).attr("d", function () {
                        return "M" + start[0] + "," + start[1]
                            + " C" + start[0] + "," + (start[1] + end[1]) / 2
                            + " " + end[0] + "," + (start[1] + end[1]) / 2
                            + " " + end[0] + "," + end[1];
                    });
                });

            // 更新输入线的位置
            d3.selectAll('path[to="' + id + '"]')
                .each(function () {
                    var path = d3.select(this).attr("d");
                    var start = path.substring(1, path.indexOf("C")).split(",");
                    start[0] = +start[0];
                    start[1] = +start[1];

                    var end = d3.select(this).attr("end").split(",");
                    end[0] = +end[0] + t1[0];
                    end[1] = +end[1] + t1[1];

                    d3.select(this).attr("d", function () {
                        return "M" + start[0] + "," + start[1]
                            + " C" + start[0] + "," + (start[1] + end[1]) / 2
                            + " " + end[0] + "," + (start[1] + end[1]) / 2
                            + " " + end[0] + "," + end[1];
                    });
                });

        },
        dragended: function () {
            dx = dy = 0;
            dragElem = null;
        },
        /**
         * 2.增加线，回传json数据
         * @param svg
         * @param line
         */
        addLine: function (svg, line) {
            svg.append("path")
                .attr("class", "cable")
                .attr("from", line.startId)
                .attr("to", line.endId)
                .attr("marker-end", "url(#arrowhead)")
                .attr("d", line.d)
                .attr("id", line.id)
                .attr("start", line.start)
                .attr("end", line.end)
                .attr("outputPos", line.outputPos)
                .on("click", api.addDeleteBtnInLine);
        },
        //线
        linestarted: function () {
            drawLine = false;
            // 当前选中的circle
            var anchor = d3.select(this);
            // 当前选中的节点
            var node = d3.select(this.parentNode);

            //判断线数组中fromid=入口
            var whichOutput = anchor.attr("outputPos") == 0 ? "left" : "right";
            var outLineLength = workflow.nodes.filter(function (en) {
                return en.id == node.attr("id");
            });

            if (outLineLength[0].childrenMsg[whichOutput] != undefined && outLineLength[0].childrenMsg[whichOutput] != "") {
                alert("一个出口只能连一条线");
                banAddLine = true;
                return false;
            } else {
                banAddLine = false;
            }

            var rect = node.node().getBoundingClientRect();
            var dx = 0;
            if (anchor.attr("outputPos") == 0) {
                dx = rect.width / 3;
            } else {
                dx = rect.width * 2 / 3;
            }
            var dy = rect.height;
            var transform = node.attr("transform");
            translate = api.getTranslate(transform);
            points.push([dx + translate[0], dy + translate[1]]);
            activeLine = d3.select("svg")
                .append("path")
                .attr("class", "cable")
                .attr("from", node.attr("id"))
                .attr("start", dx + ", " + dy)
                .attr("outputPos", d3.select(this).attr("outputPos"))
                .attr("marker-end", "url(#arrowhead)");
        },
        linedragged: function () {
            if (banAddLine) {
                return;
            }

            drawLine = true;
            points[1] = [d3.event.x + translate[0], d3.event.y + translate[1]];
            activeLine.attr("d", function () {
                return "M" + points[0][0] + "," + points[0][1]
                    + " C" + points[0][0] + "," + (points[0][1] + points[1][1]) / 2
                    + " " + points[1][0] + "," + (points[0][1] + points[1][1]) / 2
                    + " " + points[1][0] + "," + points[1][1];
            });
        },
        lineended: function () {
            if (banAddLine) {
                return;
            }

            drawLine = false;
            var anchor = d3.selectAll("circle.end");
            if (anchor.empty()) {
                activeLine.remove();
            } else {
                var pNode = d3.select(anchor.node().parentNode);
                var input = pNode.node().getBoundingClientRect().width / 2;
                anchor.classed("end", false);
                activeLine.attr("to", pNode.attr("id"));
                activeLine.attr("input", anchor.attr("input"));
                activeLine.attr("end", input + ", 0");
                activeLine.attr("id", new Date().getTime());
                //记录节点拥有的子节点
                var startNode = d3.select(this.parentNode);
                for (var i = 0, len = workflow.nodes.length; i < len; i++) {
                    if (workflow.nodes[i].id == startNode.attr("id")) {
                        if (d3.select(this).attr("outputPos") == 0) {
                            workflow.nodes[i].childrenMsg.left = pNode.attr("id");
                        } else {
                            workflow.nodes[i].childrenMsg.right = pNode.attr("id");
                        }
                    }
                }

                workflow.lines.push({
                    id: activeLine.attr("id"),//线的id
                    outputPos: activeLine.attr("outputPos"),//线起点的位置，左(0)or右(1)
                    d: activeLine.attr("d"),//线的路径
                    start: activeLine.attr("start"),
                    end: activeLine.attr("end"),
                    startId: startNode.attr("id"),//起始节点id
                    startDataId: startNode.attr("data-id"),//起始节点data-id
                    endId: pNode.attr("id"),//结束节点id
                    endDataId: pNode.attr("data-id")//结束节点data-id
                });
                console.log("workflow", JSON.stringify(workflow));
                // console.log("workflow", workflow);

                //点击线出现删除按钮
                activeLine.on("click", api.addDeleteBtnInLine);

            }
            activeLine = null;
            points.length = 0;
            translate = null;
        },
        getTranslate: function (transform) {
            var arr = transform.substring(transform.indexOf("(") + 1, transform.indexOf(")")).split(",");
            return [+arr[0], +arr[1]];
        },
        /**
         * 初始化渲染
         */
        newTreeChart: function (svg, data) {
            data.nodes.forEach(function (item, i) {
                //添加节点
                api.addNode(svg, item);
            });
            data.lines.forEach(function (item, i) {
                //添加线
                api.addLine(svg, item);
            });
        },
        /**
         * 线增加删除按钮
         */
        addDeleteBtnInLine: function () {
            var pathParam = d3.select(this).attr("d").split(" ");
            var x = (parseFloat(pathParam[0].split(",")[0].substr(1)) + parseFloat(pathParam[2].split(",")[0])) / 2;
            var y = pathParam[2].split(",")[1];
            d3.select("svg")
                .append("circle")
                .attr("class", "deleteLine")
                .attr("cx", x)
                .attr("cy", y)
                .attr("r", 10)
                .attr("stroke", "#000")
                .attr("lineId", d3.select(this).attr("id"))
                .attr("fill", "url(#deleteLine)")
                .on("click", function () {
                    var lineId = d3.select(this).attr("lineId");
                    d3.select("path[id='" + lineId + "']").remove();
                    this.remove();

                    //删除数据集中对应参数
                    workflow.lines.forEach(function (y, j) {
                        if (y.id == lineId) {
                            var startId = y.startId;
                            var childernPos = y.outputPos == 0 ? "left" : "right";
                            workflow.nodes.forEach(function (e, i) {
                                if (startId == e.id) {
                                    e.childrenMsg[childernPos] = "";
                                    return false;
                                }
                            });
                            workflow.lines.splice(j, 1);
                            return false;
                        }
                    });

                    console.log("workflow:", workflow);
                    d3.event.stopPropagation();
                });
            d3.event.stopPropagation();
        },
        /**
         * 检验tree是否规范
         */
        checkTreeCorrectBtn: function () {
            //1.nodes比lines多一个
            if (workflow.nodes.length - workflow.lines.length != 1) {
                alert("tree搭建不规范！");
            }
            for (var i = 0, len = workflow.nodes.length; i < len; i++) {
                if (workflow.nodes[i].outputs == 1) {
                    if (workflow.nodes[i].childrenMsg.left == undefined || workflow.nodes[i].childrenMsg.left == "" || workflow.nodes[i].childrenMsg.right == undefined || workflow.nodes[i].childrenMsg.right == "") {
                        alert("tree搭建不规范！" + workflow.nodes[i].id + "节点没有画子节点");
                    }
                }
            }
        },
        /**
         * 数据转化为sql
         */
        transformToSql: function () {
            var sqlRes = [];
            var allNotLeafChildren = [];
            
            var allNotLeafNode = workflow.nodes.filter(function (en) {
                return en.outputs == 1;
            });

            for (var i = 0, len = allNotLeafNode.length; i < len; i++) {
                if(allNotLeafNode[i].outputs == 1){
                    allNotLeafChildren.push(allNotLeafNode[i].childrenMsg.left);
                    allNotLeafChildren.push(allNotLeafNode[i].childrenMsg.right);
                }
            }
            var rootNode = allNotLeafNode.filter(function(item) {
                return !allNotLeafChildren.includes(item.id.toString())
            });
            console.log("allNotLeafNode",allNotLeafNode);
            console.log("allNotLeafChildren",allNotLeafChildren);
            console.log("rootNode",rootNode);
            api.test(rootNode[0],sqlRes);
            console.log("sqlRes",sqlRes);
            console.log("sqlRes",sqlRes.join(""));

        },
        test: function (node, res) {
            if (!node) {
                return;
            }
            var leftNode = workflow.nodes.filter(function (en) {
                return en.id == node.childrenMsg.left;
            })[0];
            console.log("leftNode",leftNode);
            api.test(leftNode, res);

            if (node.outputs == 0) {
                res.push("(" + node.dataId + ")");
                // res += "(" + node.dataId + ")";
            } else {
                res.push(node.dataId);
                // res += node.dataId;
            }

            console.log(res);

            var rightNode = workflow.nodes.filter(function (en) {
                return en.id == node.childrenMsg.right;
            })[0];
            console.log("rightNode",rightNode);
            api.test(rightNode, res);


            // for (var j = 0, len = workflow.nodes.length; j < len; j++) {
            //     if (workflow.nodes[j].id == node.childrenMsg.left) {
            //         if (workflow.nodes[j].outputs == 0) {
            //             var rightNode = workflow.nodes.filter(function (en) {
            //                 return en.id == node.childrenMsg.right;
            //             })[0];
            //             sqlRes += "(" + workflow.nodes[j].dataId + ")" + node.dataId + "(" + rightNode.id + ")";
            //             if (rightNode.outputs == 0) {
            //
            //             }
            //             test(workflow.nodes[j]);
            //         } else {
            //             test(workflow.nodes[j]);
            //         }
            //         break;
            //     }
            // }

        },

    };

    //点击body去除浮动按钮
    options.svg.on("click", function () {
        d3.select(".deleteLine").remove();
    });

    this.tree = api;

})(d3);
