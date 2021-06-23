"use strict";

import React from "react";
import PropTypes from "prop-types";
import ReactNative, {
    requireNativeComponent,
    NativeModules,
    UIManager,
    PanResponder,
    PixelRatio,
    Platform,
    ViewPropTypes,
    processColor,
} from "react-native";
import uuid from "react-native-uuid";
import { requestPermissions } from "./handlePermissions";

const RNImageEditor = requireNativeComponent("RNImageEditor", ImageEditor, {
    nativeOnly: {
        nativeID: true,
        onChange: true,
    },
});

const ImageEditorManager = NativeModules.RNImageEditorManager || {};

class ImageEditor extends React.Component {
    static propTypes = {
        onLayout: PropTypes.func,
        style: ViewPropTypes.style,
        strokeColor: PropTypes.string,
        strokeWidth: PropTypes.number,
        onPathsChange: PropTypes.func,
        onStrokeStart: PropTypes.func,
        onStrokeChanged: PropTypes.func,
        onStrokeEnd: PropTypes.func,
        onSketchSaved: PropTypes.func,
        onShapeSelectionChanged: PropTypes.func,
        shapeConfiguration: PropTypes.shape({
            shapeBorderColor: PropTypes.string,
            shapeBorderStyle: PropTypes.string,
            shapeBorderStrokeWidth: PropTypes.number,
            shapeColor: PropTypes.string,
            shapeStrokeWidth: PropTypes.number,
        }),
        user: PropTypes.string,
        scale: PropTypes.number,

        touchEnabled: PropTypes.bool,

        text: PropTypes.arrayOf(
            PropTypes.shape({
                text: PropTypes.string,
                font: PropTypes.string,
                fontSize: PropTypes.number,
                fontColor: PropTypes.string,
                overlay: PropTypes.oneOf(["TextOnSketch", "SketchOnText"]),
                anchor: PropTypes.shape({ x: PropTypes.number, y: PropTypes.number }),
                position: PropTypes.shape({ x: PropTypes.number, y: PropTypes.number }),
                coordinate: PropTypes.oneOf(["Absolute", "Ratio"]),
                alignment: PropTypes.oneOf(["Left", "Center", "Right"]),
                lineHeightMultiple: PropTypes.number,
            })
        ),
        localSourceImage: PropTypes.shape({
            filename: PropTypes.string,
            directory: PropTypes.string,
            mode: PropTypes.oneOf(["AspectFill", "AspectFit", "ScaleToFill"]),
        }),

        permissionDialogTitle: PropTypes.string,
        permissionDialogMessage: PropTypes.string,

        gesturesEnabled: PropTypes.bool,

        mode: PropTypes.oneOf(["draw", "text", "select"]),
        onModeChanged: PropTypes.func,

        onAddTextShape: PropTypes.func,

        onOperationsChange: PropTypes.func,
    };

    static defaultProps = {
        style: null,
        strokeColor: "#000000",
        strokeWidth: 3,
        onPathsChange: () => {},
        onStrokeStart: () => {},
        onStrokeChanged: () => {},
        onStrokeEnd: () => {},
        onSketchSaved: () => {},
        onShapeSelectionChanged: () => {},
        onLayout: null,
        shapeConfiguration: {
            shapeBorderColor: "transparent",
            shapeBorderStyle: "Dashed",
            shapeBorderStrokeWidth: 1,
            shapeColor: "#000000",
            shapeStrokeWidth: 3,
        },
        user: null,
        scale: 1,

        touchEnabled: true,

        text: null,
        localSourceImage: null,

        permissionDialogTitle: "",
        permissionDialogMessage: "",

        gesturesEnabled: true,

        defaultPaths: [],

        mode: "draw",
        onModeChanged: () => {},

        onAddTextShape: () => {},

        onOperationsChange: () => {},
    };

    state = {
        text: null,
        hasPanResponder: false,
        isShapeSelected: false,
    };

    constructor(props) {
        super(props);
        this._defaultPaths = this.props.defaultPaths;
        this._pathsToProcess = this.props.defaultPaths || [];
        this._paths = [];
        this._path = null;
        this._handle = null;
        this._screenScale = Platform.OS === "ios" ? 1 : PixelRatio.get();
        this._offset = { x: 0, y: 0 };
        this._size = { width: 0, height: 0 };
        this._initialized = false;

        this.state = {
            text: ImageEditor.processText(props.text ? props.text.map((t) => Object.assign({}, t)) : null),
            hasPanResponder: false,
        };

        this._operations = [];
        this._undoHistory = [];
    }

    static getDerivedStateFromProps(nextProps, prevState) {
        if (nextProps.text) {
            return {
                text: ImageEditor.processText(nextProps.text ? nextProps.text.map((t) => Object.assign({}, t)) : null),
            };
        } else {
            return null;
        }
    }

    static processText(text) {
        text && text.forEach((t) => (t.fontColor = processColor(t.fontColor)));
        return text;
    }

    componentDidUpdate(prevProps, prevState) {
        if (prevState.text !== this.state.text) {
            this.setState({
                text: this.state.text,
            });
        }
    }

    clear() {
        this._paths = [];
        this._path = null;
        this._pathsToProcess = [];
        this._operations = [];
        UIManager.dispatchViewManagerCommand(
            this._handle,
            UIManager.getViewManagerConfig(RNImageEditor).Commands.clear,
            []
        );
    }

    undo() {
        let lastId = -1;
        this._paths.forEach((d) => (lastId = d.drawer === this.props.user ? d.path.id : lastId));
        if (lastId >= 0) this.deletePath(lastId);
        return lastId;
    }

    addPath(data) {
        if (this._initialized) {
            if (this._paths.filter((p) => p.path.id === data.path.id).length === 0) this._paths.push(data);
            const pathData = data.path.data.map((p) => {
                const coor = p.split(",").map((pp) => parseFloat(pp).toFixed(2));
                return `${(coor[0] * this._screenScale * this._size.width) / data.size.width},${
                    (coor[1] * this._screenScale * this._size.height) / data.size.height
                }`;
            });
            UIManager.dispatchViewManagerCommand(
                this._handle,
                UIManager.getViewManagerConfig(RNImageEditor).Commands.addPath,
                [data.path.id, processColor(data.path.color), data.path.width * this._screenScale, pathData]
            );
        } else {
            this._pathsToProcess.filter((p) => p.path.id === data.path.id).length === 0 &&
                this._pathsToProcess.push(data);
        }
    }

    deletePath(id) {
        this._paths = this._paths.filter((p) => p.path.id !== id);
        UIManager.dispatchViewManagerCommand(
            this._handle,
            UIManager.getViewManagerConfig(RNImageEditor).Commands.deletePath,
            [id]
        );
    }

    addShape(config) {
        if (config) {
            let fontSize = config.textShapeFontSize ? config.textShapeFontSize : 0;
            UIManager.dispatchViewManagerCommand(
                this._handle,
                UIManager.getViewManagerConfig(RNImageEditor).Commands.addShape,
                [config.shapeType, config.textShapeFontType, fontSize, config.textShapeText, config.imageShapeAsset]
            );
        }
    }

    deleteSelectedShape() {
        UIManager.dispatchViewManagerCommand(
            this._handle,
            UIManager.getViewManagerConfig(RNImageEditor).Commands.deleteSelectedShape,
            []
        );
    }

    unselectShape() {
        UIManager.dispatchViewManagerCommand(
            this._handle,
            UIManager.getViewManagerConfig(RNImageEditor).Commands.unselectShape,
            []
        );
    }

    increaseSelectedShapeFontsize() {
        UIManager.dispatchViewManagerCommand(
            this._handle,
            UIManager.getViewManagerConfig(RNImageEditor).Commands.increaseShapeFontsize,
            []
        );
    }

    decreaseSelectedShapeFontsize() {
        UIManager.dispatchViewManagerCommand(
            this._handle,
            UIManager.getViewManagerConfig(RNImageEditor).Commands.decreaseShapeFontsize,
            []
        );
    }

    changeSelectedShapeText(newText) {
        UIManager.dispatchViewManagerCommand(
            this._handle,
            UIManager.getViewManagerConfig(RNImageEditor).Commands.changeShapeText,
            [newText]
        );
    }

    save(imageType, transparent, folder, filename, includeImage, includeText, cropToImageSize) {
        UIManager.dispatchViewManagerCommand(
            this._handle,
            UIManager.getViewManagerConfig(RNImageEditor).Commands.save,
            [imageType, folder, filename, transparent, includeImage, includeText, cropToImageSize]
        );
    }

    getPaths() {
        return this._paths;
    }

    getBase64(imageType, transparent, includeImage, includeText, cropToImageSize, callback) {
        if (Platform.OS === "ios") {
            ImageEditorManager.transferToBase64(
                this._handle,
                imageType,
                transparent,
                includeImage,
                includeText,
                cropToImageSize,
                callback
            );
        } else {
            NativeModules.ImageEditorModule.transferToBase64(
                this._handle,
                imageType,
                transparent,
                includeImage,
                includeText,
                cropToImageSize,
                callback
            );
        }
    }

    addOperation = (operation) => {
        if (this._initialized) {
            if (this._operations.filter((o) => o.id === operation.id).length === 0) this._operations.push(operation);
            switch (operation.data.type) {
                case "draw":
                    const pathData = operation.data.path.data.map((p) => {
                        const coor = p.split(",").map((pp) => parseFloat(pp).toFixed(2));
                        return `${(coor[0] * this._screenScale * this._size.width) / operation.data.size.width},${
                            (coor[1] * this._screenScale * this._size.height) / operation.data.size.height
                        }`;
                    });

                    UIManager.dispatchViewManagerCommand(
                        this._handle,
                        UIManager.getViewManagerConfig(RNImageEditor).Commands.addPath,
                        [
                            operation.data.path.id,
                            processColor(operation.data.path.color),
                            operation.data.path.width * this._screenScale,
                            pathData,
                        ]
                    );
                    this.props.onOperationsChange(operation, this._operations);
                    break;
                case "text":
                    const coorCenter = operation.data.posCenter.split(",").map((pp) => parseFloat(pp).toFixed(2));

                    UIManager.dispatchViewManagerCommand(
                        this._handle,
                        UIManager.getViewManagerConfig(RNImageEditor).Commands.addShape,
                        [
                            "Text",
                            null,
                            20,
                            operation.data.text,
                            null,
                            operation.userId,
                            operation.data.id,
                            `${
                                (coorCenter[0] * this._screenScale * this._size.width) / operation.data.screensize.width
                            },${
                                (coorCenter[1] * this._screenScale * this._size.height) /
                                operation.data.screensize.height
                            }`,
                            operation.data.scale,
                            operation.data.rotate,
                            processColor(operation.data.color ? operation.data.color : this.props.strokeColor),
                        ]
                    );
                    // this._operations.push(operation);
                    break;
                default:
                    break;
            }
        }
    };

    deleleteOperation = (operation) => {
        switch (operation.data.type) {
            case "draw":
                UIManager.dispatchViewManagerCommand(
                    this._handle,
                    UIManager.getViewManagerConfig(RNImageEditor).Commands.deletePath,
                    [operation.data.path.id]
                );
                break;
            case "text":
                UIManager.dispatchViewManagerCommand(
                    this._handle,
                    UIManager.getViewManagerConfig(RNImageEditor).Commands.deleteShape,
                    [operation.data.id]
                );
                break;
            default:
                break;
        }
    };

    undoOperation = () => {
        this._operations.sort((a, b) => a.timestamp - b.timestamp);
        if (this._operations.length) {
            const tempOper = this._operations.pop();
            this._undoHistory.push(tempOper);
            this.deleleteOperation(tempOper);
            this.props.onOperationsChange(tempOper, this._operations);
        }
    };

    redoOperation = () => {
        this._operations.sort((a, b) => a.timestamp - b.timestamp);
        if (this._undoHistory.length) {
            const tempOper = this._undoHistory.pop();
            this._operations.push(tempOper);
            this.addOperation(tempOper);
        }
    };

    getOpertations() {
        return this._operations;
    }

    async componentDidMount() {
        const isStoragePermissionAuthorized = await requestPermissions(
            this.props.permissionDialogTitle,
            this.props.permissionDialogMessage
        );
        this.panResponder = PanResponder.create({
            // Ask to be the responder:
            onStartShouldSetPanResponder: (evt, gestureState) => true,
            onStartShouldSetPanResponderCapture: (evt, gestureState) => true,
            onMoveShouldSetPanResponder: (evt, gestureState) => true,
            onMoveShouldSetPanResponderCapture: (evt, gestureState) => true,

            onPanResponderGrant: (evt, gestureState) => {
                if (!this.props.touchEnabled || evt.nativeEvent.touches.length > 1) return;
                const e = evt.nativeEvent;
                this._offset = { x: e.pageX - e.locationX, y: e.pageY - e.locationY };

                const x = parseFloat((gestureState.x0 - this._offset.x).toFixed(2)),
                    y = parseFloat((gestureState.y0 - this._offset.y).toFixed(2));

                switch (this.props.mode) {
                    case "draw":
                        this._path = {
                            id: parseInt(Math.random() * 100000000),
                            color: this.props.strokeColor,
                            width: this.props.strokeWidth,
                            data: [],
                        };

                        UIManager.dispatchViewManagerCommand(
                            this._handle,
                            UIManager.getViewManagerConfig(RNImageEditor).Commands.newPath,
                            [this._path.id, processColor(this._path.color), this._path.width * this._screenScale]
                        );
                        UIManager.dispatchViewManagerCommand(
                            this._handle,
                            UIManager.getViewManagerConfig(RNImageEditor).Commands.addPoint,
                            [
                                parseFloat((gestureState.x0 - this._offset.x).toFixed(2) * this._screenScale),
                                parseFloat((gestureState.y0 - this._offset.y).toFixed(2) * this._screenScale),
                                false,
                            ]
                        );
                        this._path.data.push(`${x},${y}`);
                        this.props.onStrokeStart(x, y);
                        break;
                    case "text":
                        if (!this.state.isShapeSelected) {
                            this.props.onAddTextShape(`${x},${y}`, this._size);
                        }
                        break;
                    default:
                        break;
                }
            },
            onPanResponderMove: (evt, gestureState) => {
                if (!this.props.touchEnabled) return;
                if (Math.abs(gestureState.dx) < 2.5 || Math.abs(gestureState.dy) < 2.5) return;
                switch (this.props.mode) {
                    case "draw":
                        if (this._path) {
                            const x = parseFloat(
                                    (gestureState.x0 + gestureState.dx / this.props.scale - this._offset.x).toFixed(2)
                                ),
                                y = parseFloat(
                                    (gestureState.y0 + gestureState.dy / this.props.scale - this._offset.y).toFixed(2)
                                );
                            UIManager.dispatchViewManagerCommand(
                                this._handle,
                                UIManager.getViewManagerConfig(RNImageEditor).Commands.addPoint,
                                [parseFloat(x * this._screenScale), parseFloat(y * this._screenScale), true]
                            );
                            this._path.data.push(`${x},${y}`);
                            this.props.onStrokeChanged(x, y);
                        }
                        break;
                    default:
                        break;
                }
            },
            onPanResponderRelease: (evt, gestureState) => {
                if (!this.props.touchEnabled) return;
                switch (this.props.mode) {
                    case "draw":
                        if (this._path) {
                            this.props.onStrokeEnd({ path: this._path, size: this._size, drawer: this.props.user });
                            this._paths.push({ path: this._path, size: this._size, drawer: this.props.user });
                            let line = [];
                            this._path.data.forEach((point, index) => {
                                if (index < this._path.data.length - 1) {
                                    line.push({
                                        start: { offsetX: point.split(",")[0], offsetY: point.split(",")[1] },
                                        stop: {
                                            offsetX: this._path.data[index + 1].split(",")[0],
                                            offsetY: this._path.data[index + 1].split(",")[1],
                                        },
                                    });
                                }
                            });
                            const newOperation = {
                                id: uuid.v4(),
                                userId: this.props.user,
                                timestamp: Date.now(),
                                data: {
                                    path: { ...this._path, line },
                                    size: this._size,
                                    type: this.props.mode,
                                },
                            };
                            this._operations.push(newOperation);
                            this.props.onOperationsChange(newOperation, this._operations);
                        }
                        UIManager.dispatchViewManagerCommand(
                            this._handle,
                            UIManager.getViewManagerConfig(RNImageEditor).Commands.endPath,
                            []
                        );
                        break;
                    default:
                        break;
                }
            },
            onShouldBlockNativeResponder: (evt, gestureState) => {
                return this.props.touchEnabled;
            },
        });

        this.setState({
            hasPanResponder: true,
        });
    }

    render() {
        return (
            <RNImageEditor
                ref={(ref) => {
                    this._handle = ReactNative.findNodeHandle(ref);
                }}
                style={this.props.style}
                onLayout={(e) => {
                    this._size = { width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height };
                    this._initialized = true;
                    this._pathsToProcess.length > 0 && this._pathsToProcess.forEach((p) => this.addPath(p));
                    if (this.props.onLayout) this.props.onLayout(e);
                }}
                {...(this.state.hasPanResponder ? this.panResponder.panHandlers : undefined)}
                {...this.panResponder?.panHandlers}
                onChange={(e) => {
                    if (e.nativeEvent.hasOwnProperty("pathsUpdate")) {
                        this.props.onPathsChange(e.nativeEvent.pathsUpdate);
                    } else if (e.nativeEvent.hasOwnProperty("success") && e.nativeEvent.hasOwnProperty("path")) {
                        this.props.onSketchSaved(e.nativeEvent.success, e.nativeEvent.path);
                    } else if (e.nativeEvent.hasOwnProperty("success")) {
                        this.props.onSketchSaved(e.nativeEvent.success);
                    } else if (e.nativeEvent.hasOwnProperty("isShapeSelected")) {
                        this.props.onShapeSelectionChanged(e.nativeEvent.isShapeSelected, e.nativeEvent.shapeText);
                        this.setState({
                            isShapeSelected: e.nativeEvent.isShapeSelected,
                        });
                    } else if (e.nativeEvent.hasOwnProperty("isShapeUpdated")) {
                        const {
                            shapeId,
                            shapeScale,
                            shapeRotate,
                            shapeCenterX,
                            shapeCenterY,
                            shapeWidth,
                            shapeHeight,
                        } = e.nativeEvent;
                        const selectedIndex = this._operations.findIndex((oper) => oper.data.id === shapeId);
                        if (selectedIndex !== -1) {
                            const xRatio =
                                this._operations[selectedIndex].data.screensize.width /
                                (this._screenScale * this._size.width);
                            const yRatio =
                                this._operations[selectedIndex].data.screensize.height /
                                (this._screenScale * this._size.height);
                            this._operations[selectedIndex].data = {
                                ...this._operations[selectedIndex].data,
                                scale: shapeScale,
                                rotate: shapeRotate,
                                posCenter: `${shapeCenterX * xRatio},${shapeCenterY * yRatio}`,
                                pos: `${(shapeCenterX - shapeWidth / 2) * xRatio},${
                                    (shapeCenterY - shapeHeight / 2) * yRatio
                                }`,
                                // screensize: this._size,
                            };
                        }
                        this.props.onOperationsChange(this._operations[selectedIndex], this._operations);
                    }
                }}
                localSourceImage={this.props.localSourceImage}
                permissionDialogTitle={this.props.permissionDialogTitle}
                permissionDialogMessage={this.props.permissionDialogMessage}
                shapeConfiguration={{
                    shapeBorderColor: processColor(this.props.shapeConfiguration.shapeBorderColor),
                    shapeBorderStyle: this.props.shapeConfiguration.shapeBorderStyle,
                    shapeBorderStrokeWidth: this.props.shapeConfiguration.shapeBorderStrokeWidth,
                    shapeColor: processColor(this.props.strokeColor),
                    shapeStrokeWidth: this.props.strokeWidth,
                }}
                text={this.state.text}
                gesturesEnabled={this.props.gesturesEnabled}
                mode={this.props.mode}
                user={this.props.user}
                // gesturesEnabled={!this.props.touchEnabled}
            />
        );
    }
}

ImageEditor.MAIN_BUNDLE =
    Platform.OS === "ios" ? UIManager.getViewManagerConfig(RNImageEditor).Constants.MainBundlePath : "";
ImageEditor.DOCUMENT =
    Platform.OS === "ios" ? UIManager.getViewManagerConfig(RNImageEditor).Constants.NSDocumentDirectory : "";
ImageEditor.LIBRARY =
    Platform.OS === "ios" ? UIManager.getViewManagerConfig(RNImageEditor).Constants.NSLibraryDirectory : "";
ImageEditor.CACHES =
    Platform.OS === "ios" ? UIManager.getViewManagerConfig(RNImageEditor).Constants.NSCachesDirectory : "";

module.exports = ImageEditor;
