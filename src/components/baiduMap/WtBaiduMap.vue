<template>
    <baidu-map
            ref="baiduMap"
            class="wt-baidu-map"
            :center="center"
            :zoom="zoom"
            :scroll-wheel-zoom="true"
            :map-type="mapType"
            @ready="_ready"
            :map-click="false"
    >
        <!--热力图-->
        <bml-heatmap
                :data="heatMapPoints"
                :max="heatMapConfig.max"
                :radius="heatMapConfig.radius">
        </bml-heatmap>

        <!--比例尺-->
        <bm-scale anchor="BMAP_ANCHOR_BOTTOM_RIGHT" :offset="{width: 9, height: 5}"></bm-scale>

        <!--气泡框-->
        <bm-info-window :position="infoWindowPosition" :show="showInfoWindow">
            <div class="wt-info-window">
                <component v-bind:is="infoWindowContent"></component>
            </div>
        </bm-info-window>

        <!--缩放-->
        <bm-navigation anchor="BMAP_ANCHOR_TOP_RIGHT"></bm-navigation>

        <!--海量点-->
        <bm-point-collection
                :points="shapePoints"
                :color="shapeConfig.color"
                :size="shapeConfig.size"
                :shape="shapeConfig.shape"
                @click="clickShapePoint"
        ></bm-point-collection>

        <!--交通流量-->
        <bm-traffic v-if="showTraffic"></bm-traffic>

        <!--全景-->
        <bm-panorama :offset="{width: 5, height: 50}" anchor="BMAP_ANCHOR_TOP_LEFT"></bm-panorama>

        <!--覆盖物-->
        <span v-for="(marker, index) of markerList" :key="'marker-' + index">
            <bm-marker
                    :key="'bm-marker-' + index"
                    :ref="'marker-' + marker.id"
                    class="wt-image-marker"
                    :position="marker.position"
                    @click="marker.click"
                    :icon="marker.getIcon()"
            >
            </bm-marker>

            <bm-label
                    :key="'bm-label-' + index"
                    :ref="'marker-label-' + marker.id"
                    v-if="typeof marker.label === 'object'"
                    :content="marker.label.text"
                    :position="marker.label.position"
                    :label-style="marker.label.style"
            >
            </bm-label>
        </span>

        <!--控制面板-->
        <bm-control :offset="{width: 5, height: 15}" v-if="showBtn">
            <div class="wt-map-btn">
                <template v-for="item in btn">
                    <wt-action-btn v-if="hideBtn.indexOf(item.title) === -1" :item="item"></wt-action-btn>
                </template>
            </div>
        </bm-control>

        <!--自定义操作按钮-->
        <bm-control>
            <div class="wt-other-action">
                <template v-for="item in otherBtn">
                    <wt-action-btn :item="item"></wt-action-btn>
                </template>
            </div>
        </bm-control>

        <!--多边形围栏-->
        <bm-polygon
                :path="polygonPoints"
                :stroke-color="fenceConfig.color"
                :stroke-opacity="fenceConfig.opacity"
                :stroke-weight="fenceConfig.weight"
                :editing="fenceEdit"
                @lineupdate="updatePolygonPath"
        />

        <!--圆形围栏-->
        <bm-circle
                v-if="circlePoints.center && circlePoints.radius"
                :center="circlePoints.center"
                :radius="circlePoints.radius"
                :stroke-color="fenceConfig.color"
                :stroke-opacity="fenceConfig.opacity"
                :stroke-weight="fenceConfig.weight"
                @lineupdate="updateCirclePath"
                :editing="fenceEdit"
        ></bm-circle>

        <bm-polyline
                :path="polylinePoints"
                :stroke-color="fenceConfig.color"
                :stroke-opacity="fenceConfig.opacity"
                :stroke-weight="fenceConfig.weight"
                :editing="fenceEdit"
                @lineupdate="updatePolylinePath"
        ></bm-polyline>
    </baidu-map>
</template>

<script>
    import props from './Props';
    import data from './Data';
    import {BmlHeatmap} from 'vue-baidu-map';
    import {InfoWindow} from './InfoWindow';
    import {Marker} from './Marker';
    import {Label} from "./Label";
    import WtActionBtn from "./WtActionBtn";

    export default {
        name: "WtBaiduMap",
        components: {WtActionBtn, BmlHeatmap},
        data: data,
        props: props,
        methods: {
            /**
             * 地图初始化完成的回调函数
             */
            _ready({map, BMap}) {
                this.jMap = map;
                this.bMap = BMap;

                let maps = {
                    vMap: this,
                    jMap: map,
                    bMap: BMap,
                };
                this.$emit('ready', maps);
            },

            /**
             * 海量点点击
             */
            clickShapePoint(e, point) {
                typeof this.shapeOnClick === 'function' ? this.shapeOnClick(e) : '';
            },

            /**
             * 打开气泡框
             * @param {InfoWindow|string} window infoWindow实例或者覆盖物ID
             */
            openInfoWindow(window) {
                let infoWindow = window;
                if (typeof window === 'string') {
                    infoWindow = this.getMarker(window).infoWindow;
                }

                this.infoWindowPosition = infoWindow.position;
                this.infoWindowContent = infoWindow.getContent();
                this.showInfoWindow = false;
                this.$nextTick(() => {
                    this.showInfoWindow = true;
                });
            },

            /**
             * 关闭气泡框
             */
            closeInfoWindow() {
                this.showInfoWindow = false;
                this.infoWindowPosition = {};
                this.infoWindowContent = '';
            },

            /**
             * 添加覆盖物
             * @param {string} id 覆盖物ID，在覆盖物列表中必须是唯一的
             * @param {{lat, lng}} position 经纬度
             * @param {{width, height}} size 图标大小
             * @param {object} labelOptions 中文标签选项
             * @param {string} icon 图标地址
             * @param {array} content 气泡框内容
             * @param {function} onClick 点击图标的回调函数
             * @param {boolean} autoOpen 自动打开气泡框，默认false
             * @param {boolean} autoCenter 是否自动居中，默认false
             */
            addMarker({id, position, labelOptions, size, icon, content, onClick, autoOpen, autoCenter}) {
                let infoWindow = undefined;
                let label = undefined;
                autoCenter = autoCenter === true ? true : false;
                if (typeof content === 'object') {
                    infoWindow = new InfoWindow({
                        position: position,
                        content: content,
                        wtBaiduMap: this,
                    });
                }
                if (typeof labelOptions === 'object') {
                    label = new Label({
                        position: position,
                        text: labelOptions.text,
                        style: labelOptions.style,
                        wtBaiduMap: this,
                    })
                }
                let marker = new Marker({
                    id: id,
                    position: position,
                    infoWindow: infoWindow,
                    label: label,
                    wtBaiduMap: this,
                    size: size,
                    onClick: onClick,
                    open: autoOpen === true ? true : false,
                    icon: icon,
                });

                let data = {};
                data[id] = marker;
                this.markerList = Object.assign({}, this.markerList, data);

                if (autoCenter) {
                    clearTimeout(this.setCenterFlag);
                    this.setCenterFlag = setTimeout(() => {
                        this._setCenter(position);
                    }, 100);
                }
            },

            /**
             * 删除覆盖物
             * @param {string} id 覆盖物ID
             */
            removeMarker(id) {
                let marker = this.getMarker(id);
                if (marker) {
                    this.closeInfoWindow();
                    delete this.markerList[id];
                    this.$nextTick(() => {
                        let ref = this.$refs['marker-' + id];
                        let refLabel = this.$refs['marker-label-' + id];
                        if (typeof ref === 'object' && ref.length) {
                            ref[0].unload();
                        }
                        if (typeof refLabel === 'object' && refLabel.length) {
                            refLabel[0].unload();
                        }
                    });
                }
            },

            /**
             * 获取覆盖物
             * @param id
             * @returns {*}
             */
            getMarker(id) {
                return this.markerList[id];
            },

            /**
             * 修改覆盖物附属气泡框的内容
             * @param id
             * @param key
             * @param value
             */
            updateInfoWindowContent(id, key, value) {
                let marker = this.getMarker(id);
                if (marker) {
                    marker.infoWindow.updateContent(key, value);
                }
            },

            /**
             * 编辑多边形围栏
             * @param e
             */
            updatePolygonPath(e) {
                if (typeof this.polygonPoints == 'object' && typeof this.fenceConfig.onChange === 'function') {
                    this.fenceConfig.onChange(e, 'polygon', this.polygonPoints);
                }
            },

            /**
             * 编辑圆形围栏
             * @param e
             */
            updateCirclePath(e) {
                if (typeof this.circlePoints == 'object' && typeof this.fenceConfig.onChange === 'function') {
                    this.fenceConfig.onChange(e, 'polygon', this.circlePoints);
                }
            },

            /**
             * 编辑折线图
             * @param e
             */
            updatePolylinePath(e) {
                if (typeof this.polylinePoints == 'object' && typeof this.fenceConfig.onChange === 'function') {
                    this.fenceConfig.onChange(e, 'polygon', this.polylinePoints);
                }
            },

            /**
             * 设置地图视野，使传入的经纬度全部都显示
             * @param {array} points
             */
            setViewPort(points) {
                this.jMap.setViewport(points);
            },

            /**
             * 使用原生方式设置中心点
             * @param {Object | String} position
             * @private
             */
            _setCenter(position) {
                if (typeof position === 'object') {
                    position = new this.bMap.Point(position.lng, position.lat);
                }
                this.jMap.setCenter(position);
            },
        },
    }
</script>

<style scoped>
    .wt-baidu-map {
        height: 100%;
    }

    .wt-map-btn {
        margin-left: -4px;
    }

    .wt-other-action {
        position: fixed;
        left: 50%;
        transform: translate(-50%, 0);
    }

    @media (max-width: 768px) {
        .wt-other-action {
            bottom: 15px;
        }
    }

    @media (min-width: 768px) {
        .wt-other-action {
            top: 15px;
        }
    }

    .wt-baidu-map-info-window-container {
        margin: 0 auto;
    }

    .wt-baidu-map-info-window-item {
        font-size: 12px;
        line-height: 1.5;
        color: #000;
        margin-bottom: 2px;
    }
</style>
