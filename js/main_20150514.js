var map;
var targetLayer;
var selected_field;
var field_name;
var target_fields = [];
var search;
var saLayer;
var saUrl = "https://route.arcgis.com/arcgis/rest/services/World/ServiceAreas/NAServer/ServiceArea_World/solveServiceArea"; // World
//var saUrl = "http://d29gfjzfcfpjgq.cloudfront.net/arcgis/rest/services/Network/network/NAServer/ServiceArea" // Japan
var resultsLayer, resultsSymbol;
var current_sa;
var get_maxvalues = false;
var get_minvalues = false;
var default_filter;
var chart;
var selected_features_data = [];
var highlightLayer;
var current_features;
var selected_field_min;

require([
	"esri/map",
	"esri/dijit/Search",

	"esri/tasks/query",
	"esri/layers/FeatureLayer",

  "esri/tasks/ServiceAreaParameters",
  "esri/SpatialReference",
  "esri/tasks/ServiceAreaTask",
  "esri/symbols/SimpleFillSymbol",
  "esri/symbols/SimpleLineSymbol",
	"esri/symbols/SimpleMarkerSymbol",
	"esri/tasks/FeatureSet",
	"esri/layers/GraphicsLayer",
	"esri/geometry/Point",
	"esri/graphic",
	"esri/Color",

	"esri/arcgis/utils",
	"esri/urlUtils",

  "dojo/on",
	"dojo/query",
  "dojo/dom",
	"dojo/dom-construct",
	"dojo/dom-class",
	"dojo/dom-style",
	"dojo/_base/array",
	"dojo/_base/window",

  "bootstrapmap",
	"bootstrap/Dropdown",
	"bootstrap/Modal",
	"bootstrap/Tab",

	"dojox/charting/Chart",
	"dojox/charting/action2d/Tooltip",
	"dojox/charting/action2d/Highlight",
	"dojox/charting/themes/MiamiNice",
	"dojox/charting/plot2d/Columns",
	"dojox/charting/plot2d/Markers",
	"dojox/charting/axis2d/Default",

	"bootstrap/Collapse",
	"esri/IdentityManager",
	"dojo/domReady!"
], function(
	Map,
	Search,

	Query,
	FeatureLayer,

	ServiceAreaParameters,
	SpatialReference,
	ServiceAreaTask,
	SimpleFillSymbol,
	SimpleLineSymbol,
	SimpleMarkerSymbol,
	FeatureSet,
	GraphicsLayer,
	Point,
	Graphic,
	Color,

	esriUtils,
	urlUtils,
  on,
	query,
	dom,
	domConstruct,
	domClass,
	domStyle,
	array,
	win,
  BootstrapMap,
	dropdown,
	modal,
	tab,

	Chart,
	Tooltip,
	Highlight,
	theme
	) {

		// URL パラメーターから Web マップ ID を取得
		var urlObject = urlUtils.urlToObject(window.location.href);
		var webmapid;
		if(urlObject.query && urlObject.query.webmap)
			webmapid = urlObject.query.webmap;

		loadWebmap(webmapid);

		// Web マップの読み込み
		function loadWebmap(webmapid) {
			console.log(webmapid);
			webmapid = webmapid || "13a2686c389a44c8a3486d769526b1fd"; // || "1683a5731cdd4086879d94306b6fb8ff";
			// Web マップからマップ オブジェクトを作成
			var mapDeferred = esriUtils.createMap(webmapid, "mapDiv", {
				mapOptions: {
					slider: true,
					nav: false,
					smartNavigation: false
				}
			});

			// マップ オブジェクト作成完了
			mapDeferred.then(function(response) {
				map = response.map;
        try {
					// Bootstrap Map にマップ オブジェクトをバインド
				  BootstrapMap.bindTo(map);
        }
        catch(err){
          console.log("boot " + err.toString())
        }

				// Web マップの名前と概要を表示
				dom.byId("mapTitle").innerHTML = response.itemInfo.item.title;
				dom.byId("mapDescription").innerHTML = response.itemInfo.item.snippet;

				// マップ読み込みが完了後レイヤー情報を取得
				if(map.loaded) {
					getLayers(map);
					//initSearchWidget(map);
				} else {
					on(map, "load", function() {
						getLayers(map);
						//initSearchWidget(map);
					});
				}

			}, function(error){
				console.log("Error loading webmap:",error);
			});

			// チャート作成
			// Create the chart within it's "holding" node
			chart = new Chart("chartNode");
			 
			// Set the theme
			chart.setTheme(theme);
			 
			// Add the only/default plot
			chart.addPlot("default", {
				type: "Columns",
				markers: true,
				gap: 3
			});

			// Create the tooltip
			var anim_a = new Tooltip(chart, "default");
			var anim_b = new Highlight(chart, "default");
			 
			// Add axes
			//chart.addAxis("x", { labels: label});
			chart.addAxis("x");
			//chart.addAxis("y", { vertical: true, fixLower: "major", fixUpper: "major" });
		}

		// 読み込んだマップのレイヤー情報の取得
		function getLayers(map) {
			console.log(map.graphicsLayerIds);
			var targetLayers = [];
			// フィーチャ レイヤー（ポイント ジオメトリ）を取得
			array.forEach(map.graphicsLayerIds, function(id) {
				if(map.getLayer(id).geometryType === "esriGeometryPoint") {
					console.log(map.getLayer(id));
					var layer = map.getLayer(id);
					targetLayers.push(map.getLayer(id));
					//targetLayer = map.getLayer(id);
					// デフォルトのフィルタリング設定を取得
					console.log(layer["_defnExpr"]);
					if(layer["_defnExpr"] != undefined) {
						default_filter = layer["_defnExpr"];
					}
				}
			});

			// 検索レイヤーの選択
			var selectLayer_id = 0;
			targetLayer = targetLayers[0];
			// 検索レイヤー選択用のタブを作成
			array.forEach(targetLayers, function(layer, i) {
				var name = layer.name;
				var description = layer.description;
				var url = layer.url;
				if(i === 0) {
					$("#layer_list").append('<li role="presentation" class="active"><a href="#layer' + i + '" aria-controls="layer' + i + '" role="tab" data-toggle="tab">' + name + '</a></li>');
					$("#layer_content").append('<div role="tabpanel" class="tab-pane active" id="layer' + i + '">' + description + '<br>' + url + '</div>');
				}
				else {
					$("#layer_list").append('<li role="presentation"><a href="#layer' + i + '" aria-controls="layer' + i + '" role="tab" data-toggle="tab">' + name + '</a></li>');
					$("#layer_content").append('<div role="tabpanel" class="tab-pane" id="layer' + i + '">' + description + '<br>' + url + '</div>');
				}
			});
			// タブを選択
			query('a[data-toggle="tab"]').on("shown.bs.tab", function (e) {
				console.log(Number(e.target.href.slice(-1)));
				// 検索レイヤーの変更
				targetLayer = targetLayers[Number(e.target.href.slice(-1))];
			});
			// 検索レイヤー選択モーダルの表示
			query("#select_layer").modal("show");
		}

		// 検索レイヤー選択完了後の処理
		function finSelectLayer() {
			// 検索レイヤー名を表示
			dom.byId("layerTitle").innerHTML = targetLayer.name;

			// フィーチャ レイヤーのフィールド情報をドロップダウン リストに入力
			array.forEach(targetLayer.fields, function(field) {
				console.log(field);
				// 数値型のフィールドのみ取得
				if(field.type === "esriFieldTypeInteger" || field.type === "esriFieldTypeSmallInteger" || field.type === "esriFieldTypeDouble") {
					console.log(field);
					target_fields.push({alias: field.alias, name: field.name, max: 0, min: 0});
					// ドロップダウン リストに要素を追加
					$("#attributes").append('<li role="presentation"><a role="menuitem" tabindex="-1" href="#">' + field.alias + '</a></li>');
				}
			});
			if(target_fields.length < 1) {
				alert("数値フィールドが存在しません。Web マップあるいはレイヤーを変更してください。");
			}

			// 空間検索結果ポイントのシンボル
			resultsSymbol = new SimpleMarkerSymbol(
				SimpleMarkerSymbol.STYLE_CIRCLE, 12,
				new SimpleLineSymbol(SimpleLineSymbol.STYLE_NULL,
				new Color([247, 34, 101, 0.9]), 1),
				new Color([207, 34, 171, 0.5])
			);

			// 到達圏解析結果用のグラフィック レイヤー
			saLayer = new GraphicsLayer();
			// 空間検索結果用のグラフィック レイヤー
			resultsLayer = new GraphicsLayer();
			// チャート連動ハイライト用グラフィック レイヤー
			highlightLayer = new GraphicsLayer();
			map.addLayers([saLayer, resultsLayer, highlightLayer]);
			map.reposition();
		}

		// フィーチャ レイヤーのフィルタリング
		function filteringLayer(minValue, maxValue) {
			// フィルタリング定義（デフォルトのフィルタリング定義がある／ない場合）
			if(default_filter == null) {
				console.log("default_filter == null");
				targetLayer.setDefinitionExpression(field_name + " >= " + minValue + " AND " + field_name + " <= " + maxValue);
			}
			else {
				console.log("default_filter: ", default_filter);
				targetLayer.setDefinitionExpression(field_name + " >= " + minValue + " AND " + field_name + " <= " + maxValue + " AND " + default_filter);
			}
			// 到達圏結果が存在したら空間検索
			if(saLayer.graphics.length > 0) {
				runQuery(current_sa.geometry);
			}
		}

		// サーチ ウィジェットの初期化
		/*function initSearchWidget(map) {
			search = new Search({
        map: map
      }, "search");
      search.startup();
		}*/

		// 到達圏解析の実行
		function runServiceAreaTask(mapPoint) {
			// 結果とクリック地点のグラフィックを消去
			saLayer.clear();
			map.graphics.clear();
			// クリック地点のグラフィック シンボル
			var pointSymbol = new SimpleMarkerSymbol(
				SimpleMarkerSymbol.STYLE_CIRCLE, 8,
					new SimpleLineSymbol(SimpleLineSymbol.STYLE_NULL,
					new Color([247, 34, 101, 0.9]), 1),
					new Color([207, 34, 171, 0.9])
			);
			// クリック地点のポイント グラフィック
			var inPoint = new Point(mapPoint.x, mapPoint.y, map.spatialReference);
			var location = new Graphic(inPoint, pointSymbol);
			map.graphics.add(location);

			// 到達圏解析の入力地点
			var features = [];
			features.push(location);
			var facilities = new FeatureSet();
			facilities.features = features;

			// 到達圏解析のパラメーター
			var params = new ServiceAreaParameters();
			params.defaultBreaks= [10];
			params.outSpatialReference = new SpatialReference(102100);
			params.returnFacilities = false;
			params.facilities = facilities;

			// 到達圏解析タスク
			var serviceAreaTask = new ServiceAreaTask(saUrl);

			// 到達圏解析の実行
			serviceAreaTask.solve(params, function(solveResult){
				console.log("serviceAreaTask.solve");
				// 解析結果
				var result = solveResult;
				// 解析結果のグラフィック シンボル
				var serviceAreaSymbol = new SimpleFillSymbol(
					SimpleFillSymbol.STYLE_SOLID,
					new SimpleLineSymbol(
						SimpleLineSymbol.STYLE_SOLID,
						new Color([232,104,80]), 2
					),
					new dojo.Color([232,104,80,0.25])
				);
				// 解析結果のグラフィックを結果レイヤーに追加
				array.forEach(solveResult.serviceAreaPolygons, function(serviceArea){
					serviceArea.setSymbol(serviceAreaSymbol);
					saLayer.add(serviceArea);
				});
				// 現在の到達圏結果
				current_sa = solveResult.serviceAreaPolygons[0];
				// 到達圏で空間検索
				runQuery(solveResult.serviceAreaPolygons[0].geometry);
			}, function(err){
				console.log(err.message);
			});
		}

		// 空間検索の実行
		function runQuery(geometry) {
			console.log("runQuery");
			// 空間検索用クエリ
			var query = new Query();
			// 到達圏解析結果グラフィックのジオメトリを検索エリアに指定
			query.geometry = geometry;
			query.orderByFields = [field_name];
			// 空間検索の実行
			targetLayer.queryFeatures(query, function(results){
				console.log("success query: ", results);
				//var oid_fieldname = results.objectIdFieldName;
				// 空間検索結果をリセット
				resultsLayer.clear();
				var chartdata = [];
				var oiddata = [];
				selected_features_data = [];
				// 空間検索結果グラフィックにシンボル適用＆レイヤーに追加
				array.forEach(results.features, function(result, i) {
					var graphic = new Graphic(result.geometry, resultsSymbol, result.attributes, result.infoTemplate);
					resultsLayer.add(graphic);
					chartdata.push(result.attributes[field_name]);
					//oiddata.push(result.attributes[oid_fieldname]);
					console.log(graphic.geometry);
					selected_features_data.push(graphic);
				});
				createChart(chartdata, selected_features_data);
			});
			/*targetLayer.selectFeatures(query, FeatureLayer.SELECTION_NEW, function(results){
				console.log("success query: ", results);
				// 空間検索結果をリセット
				//resultsLayer.clear();
				var chartdata = [];
				// 空間検索結果グラフィックにシンボル適用＆レイヤーに追加
				array.forEach(results, function(result) {
					result.setSymbol(resultsSymbol);
					resultsLayer.add(result);
					chartdata.push(result.attributes[field_name]);
				});
				createChart(chartdata);
			});*/
		}

		function createChart(data, features) {
			current_features = features;
			chart.removeSeries("y");

			// 負の数はなし
			var ymin = selected_field_min - 1;
			if(selected_field_min === 0) {
				ymin = 0;
			}

			// Y軸の原点をフィールドの最小値-1に指定
			chart.addAxis("y", { vertical: true, fixLower: "major", fixUpper: "major", min: selected_field_min - 1});

			console.log($("#selected_attribute").text());
			console.log(data);
			// Define the data
			var chartData = data;
			 
			// Add the series of data
			chart.addSeries("y", chartData);
			 
			// Render the chart!
			chart.render();

			chart.connectToPlot("default", function(evt) {
				if (evt.type === 'onmouseover') {
					console.info("Chart event on default plot!", current_features[evt.index]);
					//console.info("Event type is: ",evt.type);
					//console.info("The element clicked was: ",evt.element);
                	mouseOverChartItem(current_features[evt.index]);
                } else if (evt.type === 'onmouseout') {
                	highlightLayer.clear();
					//console.info("Event type is: ",evt.type);
					//console.info("The element clicked was: ",evt.element);
                	//mouseOutChartItem(features);
                }
			});
		}

		function mouseOverChartItem(feature) {
			highlightLayer.clear();
			var highlightSymbol = new SimpleMarkerSymbol(
				SimpleMarkerSymbol.STYLE_CIRCLE, 16,
				new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
				new Color([247, 34, 101, 0.9]), 4),
				new Color([207, 34, 171, 0])
			);
			var graphic = new Graphic(feature.geometry, highlightSymbol, feature.attributes);
			highlightLayer.add(graphic);
		}


		////**** UI制御 ****////

		// レイヤー選択ボタン
		$("#layerbtn").on("click", finSelectLayer);

		// 属性フィールドの選択
		$("#attributes").on("click", function(evt) {
		  console.log(evt);
			// 選択フィールド名の表示
			dom.byId("selected_attribute").innerHTML = evt.target.text;
			var getvalues_graphics = targetLayer.graphics;
			// フィールドの最大値/最小値を取得
			if(get_maxvalues === false) {
				array.forEach(target_fields, function(field) {
					console.log(targetLayer.graphics.length);
					array.forEach(targetLayer.graphics, function(graphic) {
						if(field.max < graphic.attributes[field.name]) {
							field.max = graphic.attributes[field.name];
						}
					});
					console.log(field.max);
				});
				get_maxvalues = true;
			}
			if(get_minvalues === false) {
				array.forEach(target_fields, function(field) {
					console.log(targetLayer.graphics.length);
					field.min = field.max;
					array.forEach(targetLayer.graphics, function(graphic) {
						if(field.min > graphic.attributes[field.name]) {
							field.min = graphic.attributes[field.name];
						}
					});
					console.log(field.min);
				});
				get_minvalues = true;
			}
			// 選択フィールドの最大値/最小値をスライダ－に適用
			array.forEach(target_fields, function(field) {
				if(field.alias === evt.target.text) {
					selected_field = field.alias;
					selected_field_min = field.min;
					field_name = field.name;
					console.log(field.min, field.max);
					$("#slider-range").slider("option", {
						max: field.max,
						min: field.min,
						values: [field.min, field.max],
						disabled: false
					});
					$("#amount").html(field.min + " - " + field.max);
					filteringLayer(field.min, field.max);
				}
			});
		});

		// スライダーの作成
		$(function() {
	    $( "#slider-range" ).slider({
	      range: true,
	      min: 0,
	      max: 0,
	      values: [ 0, 0 ],
				disabled: true,
	      slide: function(event, ui) {
	        $("#amount").html(ui.values[ 0 ] + " - " + ui.values[ 1 ]);
	      },
				stop: function(event, ui) {
					console.log("slider stop");
					// スライダ－を停めたらフィルタリング開始
					filteringLayer(ui.values[0], ui.values[1]);
				}
	    });
			$("#amount").html("属性を選択してください");
	  });

		// ツールチップの作成
		var tip = "地図上のクリックした地点で解析を実行します";
		var tooltip = domConstruct.create("div", { "class": "satip", "innerHTML": tip }, win.body());
		domStyle.set(tooltip, "position", "fixed");

		// 到達圏解析ボタンのクリック イベント
		$("#service_area_btn").on("click", function() {
			// ツールチップの表示
			var mouseMoveEvent = map.on("mouse-move", function(evt) {
				console.log("map mouse-move");
        var px, py;
        if (evt.clientX || evt.pageY) {
          px = evt.clientX;
          py = evt.clientY;
        } else {
          px = evt.clientX + win.body().scrollLeft - win.body().clientLeft;
          py = evt.clientY + win.body().scrollTop - win.body().clientTop;
        }
        tooltip.style.display = "none";
				domStyle.set(tooltip, { left: (px + 15) + "px", top: (py) + "px" });
        tooltip.style.display = "block";
      });
			var mouseOutEvent = map.on("mouse-out", function(evt){
        tooltip.style.display = "none";
      });

			// マップ クリック イベント
			var mapClickEvent = map.on("click", function(evt) {
				tooltip.style.display = "none";
				runServiceAreaTask(evt.mapPoint);
				// 到達圏解析実行関連イベントを解除
				mapClickEvent.remove();
				mouseMoveEvent.remove();
				mouseOutEvent.remove();
			});
		});

	});
