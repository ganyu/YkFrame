export class Marker {
    constructor({ id, position, size, infoWindow, label, icon, wtBaiduMap, onClick, open }) {
        this.id = id;
        this.position = position;
        this.size = size || { width: 42, height: 42 };
        this.infoWindow = infoWindow;
        this.onClick = onClick;
        this.icon = icon;
        this.label = label;
        this.wtBaiduMap = wtBaiduMap;

        this.click = (e) => {
            this._click(e);
        }

        if( open === true ) {
            if( typeof this.infoWindow === 'object' ) {
                this.infoWindow.open();
            }
        }
    }

    getIcon() {
        return {
            url: this.icon,
            size: this.size,
        };
    }

    _click(e) {
        if( typeof this.infoWindow === 'object' ) {
            this.infoWindow.open();
        }
        typeof this.onClick === 'function' ? this.onClick(e, this) : '';
    }
}