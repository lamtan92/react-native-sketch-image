import React from "react";
import PropTypes from "prop-types";
import ReactNative, {
    View,
    Text,
    TouchableOpacity,
    FlatList,
    ViewPropTypes,
    Modal,
    Pressable,
    StyleSheet,
    TextInput,
    TouchableWithoutFeedback,
} from "react-native";
import uuid from "react-native-uuid";
import ImageEditor from "./src/ImageEditor";
import { requestPermissions } from "./src/handlePermissions";

class RNSketchCanvas extends React.Component {
    static propTypes = {
        containerStyle: ViewPropTypes.style,
        canvasStyle: ViewPropTypes.style,
        onStrokeStart: PropTypes.func,
        onStrokeChanged: PropTypes.func,
        onStrokeEnd: PropTypes.func,
        onClosePressed: PropTypes.func,
        onUndoPressed: PropTypes.func,
        onClearPressed: PropTypes.func,
        onPathsChange: PropTypes.func,
        user: PropTypes.string,

        closeComponent: PropTypes.node,
        eraseComponent: PropTypes.node,
        undoComponent: PropTypes.node,
        clearComponent: PropTypes.node,
        saveComponent: PropTypes.node,
        deleteSelectedShapeComponent: PropTypes.node,
        strokeComponent: PropTypes.func,
        strokeSelectedComponent: PropTypes.func,
        strokeWidthComponent: PropTypes.func,

        strokeColors: PropTypes.arrayOf(PropTypes.shape({ color: PropTypes.string })),
        defaultStrokeIndex: PropTypes.number,
        defaultStrokeWidth: PropTypes.number,

        minStrokeWidth: PropTypes.number,
        maxStrokeWidth: PropTypes.number,
        strokeWidthStep: PropTypes.number,

        savePreference: PropTypes.func,
        onSketchSaved: PropTypes.func,
        onShapeSelectionChanged: PropTypes.func,
        shapeConfiguration: PropTypes.shape({
            shapeBorderColor: PropTypes.string,
            shapeBorderStyle: PropTypes.string,
            shapeBorderStrokeWidth: PropTypes.number,
            shapeColor: PropTypes.string,
            shapeStrokeWidth: PropTypes.number,
        }),

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
            mode: PropTypes.string,
        }),

        permissionDialogTitle: PropTypes.string,
        permissionDialogMessage: PropTypes.string,

        gesturesEnabled: PropTypes.bool,

        mode: PropTypes.oneOf(["draw", "text"]),
        onModeChanged: PropTypes.func,
        operations: PropTypes.arrayOf(
            PropTypes.shape({
                id: PropTypes.string,
                userId: PropTypes.string,
                timestamp: PropTypes.number,
                data: PropTypes.object,
            })
        ),
        onOperationsChange: PropTypes.func,
    };

    static defaultProps = {
        containerStyle: null,
        canvasStyle: null,
        onStrokeStart: () => {},
        onStrokeChanged: () => {},
        onStrokeEnd: () => {},
        onClosePressed: () => {},
        onUndoPressed: () => {},
        onClearPressed: () => {},
        onPathsChange: () => {},
        user: null,

        closeComponent: null,
        eraseComponent: null,
        undoComponent: null,
        clearComponent: null,
        saveComponent: null,
        deleteSelectedShapeComponent: null,
        strokeComponent: null,
        strokeSelectedComponent: null,
        strokeWidthComponent: null,

        strokeColors: [
            { color: "#000000" },
            { color: "#FF0000" },
            { color: "#00FFFF" },
            { color: "#0000FF" },
            { color: "#0000A0" },
            { color: "#ADD8E6" },
            { color: "#800080" },
            { color: "#FFFF00" },
            { color: "#00FF00" },
            { color: "#FF00FF" },
            { color: "#FFFFFF" },
            { color: "#C0C0C0" },
            { color: "#808080" },
            { color: "#FFA500" },
            { color: "#A52A2A" },
            { color: "#800000" },
            { color: "#008000" },
            { color: "#808000" },
        ],
        alphlaValues: ["33", "77", "AA", "FF"],
        defaultStrokeIndex: 0,
        defaultStrokeWidth: 3,

        minStrokeWidth: 3,
        maxStrokeWidth: 15,
        strokeWidthStep: 3,

        savePreference: null,
        onSketchSaved: () => {},
        onShapeSelectionChanged: () => {},
        shapeConfiguration: {
            shapeBorderColor: "transparent",
            shapeBorderStyle: "Dashed",
            shapeBorderStrokeWidth: 1,
            shapeColor: "#000000",
            shapeStrokeWidth: 3,
        },

        text: null,
        localSourceImage: null,

        permissionDialogTitle: "",
        permissionDialogMessage: "",

        mode: "text",
        onModeChanged: () => {},

        operations: [],
        onOperationsChange: () => {},
    };

    constructor(props) {
        super(props);

        this.state = {
            color: props.strokeColors[props.defaultStrokeIndex].color,
            strokeWidth: props.defaultStrokeWidth,
            alpha: "FF",
            isShowAddTextModal: false,
            textConfig: null,
            textContent: "",
        };

        this._colorChanged = false;
        this._strokeWidthStep = props.strokeWidthStep;
        this._alphaStep = -1;
    }

    clear() {
        this._sketchCanvas.clear();
    }

    undo() {
        return this._sketchCanvas.undo();
    }

    undoOperation = () => {
        return this._sketchCanvas.undoOperation();
    };

    redoOperation = () => {
        return this._sketchCanvas.redoOperation();
    };

    addPath(data) {
        this._sketchCanvas.addPath(data);
    }

    addOperation(operation) {
        this._sketchCanvas.addOperation(operation);
    }

    deletePath(id) {
        this._sketchCanvas.deletePath(id);
    }

    deleteSelectedShape() {
        this._sketchCanvas.deleteSelectedShape();
    }

    unselectShape() {
        this._sketchCanvas.unselectShape();
    }

    addShape(config) {
        this._sketchCanvas.addShape(config);
    }

    increaseSelectedShapeFontsize() {
        this._sketchCanvas.increaseSelectedShapeFontsize();
    }

    decreaseSelectedShapeFontsize() {
        this._sketchCanvas.decreaseSelectedShapeFontsize();
    }

    changeSelectedShapeText(newText) {
        this._sketchCanvas.changeSelectedShapeText(newText);
    }

    save() {
        if (this.props.savePreference) {
            const p = this.props.savePreference();
            this._sketchCanvas.save(
                p.imageType,
                p.transparent,
                p.folder ? p.folder : "",
                p.filename,
                p.includeImage !== false,
                p.includeText !== false,
                p.cropToImageSize || false
            );
        } else {
            const date = new Date();
            this._sketchCanvas.save(
                "png",
                false,
                "",
                date.getFullYear() +
                    "-" +
                    (date.getMonth() + 1) +
                    "-" +
                    ("0" + date.getDate()).slice(-2) +
                    " " +
                    ("0" + date.getHours()).slice(-2) +
                    "-" +
                    ("0" + date.getMinutes()).slice(-2) +
                    "-" +
                    ("0" + date.getSeconds()).slice(-2),
                true,
                true,
                false
            );
        }
    }

    nextStrokeWidth() {
        if (
            (this.state.strokeWidth >= this.props.maxStrokeWidth && this._strokeWidthStep > 0) ||
            (this.state.strokeWidth <= this.props.minStrokeWidth && this._strokeWidthStep < 0)
        )
            this._strokeWidthStep = -this._strokeWidthStep;
        this.setState({ strokeWidth: this.state.strokeWidth + this._strokeWidthStep });
    }

    _renderItem = ({ item, index }) => (
        <TouchableOpacity
            style={{ marginHorizontal: 2.5 }}
            onPress={() => {
                if (this.state.color === item.color) {
                    const index = this.props.alphlaValues.indexOf(this.state.alpha);
                    if (this._alphaStep < 0) {
                        this._alphaStep = index === 0 ? 1 : -1;
                        this.setState({ alpha: this.props.alphlaValues[index + this._alphaStep] });
                    } else {
                        this._alphaStep = index === this.props.alphlaValues.length - 1 ? -1 : 1;
                        this.setState({ alpha: this.props.alphlaValues[index + this._alphaStep] });
                    }
                } else {
                    this.setState({ color: item.color });
                    this._colorChanged = true;
                }
            }}
        >
            {this.state.color !== item.color && this.props.strokeComponent && this.props.strokeComponent(item.color)}
            {this.state.color === item.color &&
                this.props.strokeSelectedComponent &&
                this.props.strokeSelectedComponent(item.color + this.state.alpha, index, this._colorChanged)}
        </TouchableOpacity>
    );

    componentDidUpdate() {
        this._colorChanged = false;
    }

    async componentDidMount() {
        const isStoragePermissionAuthorized = await requestPermissions(
            this.props.permissionDialogTitle,
            this.props.permissionDialogMessage
        );
    }

    _renderSideBar = () => {
        return (
            <View
                style={{
                    position: "absolute",
                    width: 70,
                    left: 5,
                    top: 50,
                    bottom: 50,
                    backgroundColor: "yellow",
                }}
            >
                <TouchableOpacity
                    style={{
                        opacity: this.props.mode === "text" ? 0.5 : 1,
                    }}
                    disabled={this.props.mode === "draw"}
                    onPress={() => {
                        this.props.onModeChanged("draw");
                    }}
                >
                    <View
                        style={{
                            marginHorizontal: 2.5,
                            marginVertical: 8,
                            height: 30,
                            width: 60,
                            backgroundColor: "#39579A",
                            justifyContent: "center",
                            alignItems: "center",
                            borderRadius: 5,
                        }}
                    >
                        <Text style={{ color: "white" }}>Draw</Text>
                    </View>
                </TouchableOpacity>
                <TouchableOpacity
                    style={{
                        opacity: this.props.mode === "draw" ? 0.5 : 1,
                    }}
                    disabled={this.props.mode === "text"}
                    onPress={() => {
                        this.props.onModeChanged("text");
                    }}
                >
                    <View
                        style={{
                            marginHorizontal: 2.5,
                            marginVertical: 8,
                            height: 30,
                            width: 60,
                            backgroundColor: "#39579A",
                            justifyContent: "center",
                            alignItems: "center",
                            borderRadius: 5,
                        }}
                    >
                        <Text style={{ color: "white" }}>Text</Text>
                    </View>
                </TouchableOpacity>
                <TouchableOpacity
                    // disabled={this._sketchCanvas.getOperations().length === 0}
                    onPress={() => {
                        this.undoOperation();
                    }}
                >
                    <View
                        style={{
                            marginHorizontal: 2.5,
                            marginVertical: 8,
                            height: 30,
                            width: 60,
                            backgroundColor: "#39579A",
                            justifyContent: "center",
                            alignItems: "center",
                            borderRadius: 5,
                        }}
                    >
                        <Text style={{ color: "white" }}>Undo</Text>
                    </View>
                </TouchableOpacity>
                <TouchableOpacity
                    // disabled={this._sketchCanvas.getOperations().length === 0}
                    onPress={() => {
                        this.redoOperation();
                    }}
                >
                    <View
                        style={{
                            marginHorizontal: 2.5,
                            marginVertical: 8,
                            height: 30,
                            width: 60,
                            backgroundColor: "#39579A",
                            justifyContent: "center",
                            alignItems: "center",
                            borderRadius: 5,
                        }}
                    >
                        <Text style={{ color: "white" }}>Redo</Text>
                    </View>
                </TouchableOpacity>
            </View>
        );
    };

    render() {
        const { mode } = this.props;
        const { isShowAddTextModal, textConfig, textContent } = this.state;

        return (
            <View style={this.props.containerStyle}>
                <View style={{ flexDirection: "row" }}>
                    <View style={{ flexDirection: "row", flex: 1, justifyContent: "flex-start" }}>
                        {this.props.closeComponent && (
                            <TouchableOpacity
                                onPress={() => {
                                    this.props.onClosePressed();
                                }}
                            >
                                {this.props.closeComponent}
                            </TouchableOpacity>
                        )}

                        {this.props.eraseComponent && (
                            <TouchableOpacity
                                onPress={() => {
                                    this.setState({ color: "#00000000" });
                                }}
                            >
                                {this.props.eraseComponent}
                            </TouchableOpacity>
                        )}

                        {this.props.deleteSelectedShapeComponent && (
                            <TouchableOpacity
                                style={{ opacity: this.props.touchEnabled ? 0.5 : 1 }}
                                disabled={this.props.touchEnabled}
                                onPress={() => {
                                    this.deleteSelectedShape();
                                }}
                            >
                                {this.props.deleteSelectedShapeComponent}
                            </TouchableOpacity>
                        )}
                    </View>
                    <View style={{ flexDirection: "row", flex: 1, justifyContent: "flex-end" }}>
                        {this.props.strokeWidthComponent && (
                            <TouchableOpacity
                                onPress={() => {
                                    this.nextStrokeWidth();
                                }}
                            >
                                {this.props.strokeWidthComponent(this.state.strokeWidth)}
                            </TouchableOpacity>
                        )}

                        {this.props.undoComponent && (
                            <TouchableOpacity
                                onPress={() => {
                                    this.props.onUndoPressed(this.undo());
                                }}
                            >
                                {this.props.undoComponent}
                            </TouchableOpacity>
                        )}

                        {this.props.clearComponent && (
                            <TouchableOpacity
                                onPress={() => {
                                    this.clear();
                                    this.props.onClearPressed();
                                }}
                            >
                                {this.props.clearComponent}
                            </TouchableOpacity>
                        )}

                        {this.props.saveComponent && (
                            <TouchableOpacity
                                onPress={() => {
                                    this.save();
                                }}
                            >
                                {this.props.saveComponent}
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
                <ImageEditor
                    ref={(ref) => (this._sketchCanvas = ref)}
                    style={this.props.canvasStyle}
                    strokeColor={this.state.color + (this.state.color.length === 9 ? "" : this.state.alpha)}
                    shapeConfiguration={this.props.shapeConfiguration}
                    onStrokeStart={this.props.onStrokeStart}
                    onStrokeChanged={this.props.onStrokeChanged}
                    onStrokeEnd={this.props.onStrokeEnd}
                    user={this.props.user}
                    strokeWidth={this.state.strokeWidth}
                    onSketchSaved={(success, path) => this.props.onSketchSaved(success, path)}
                    onShapeSelectionChanged={(isShapeSelected) => this.props.onShapeSelectionChanged(isShapeSelected)}
                    touchEnabled={this.props.touchEnabled}
                    onPathsChange={this.props.onPathsChange}
                    text={this.props.text}
                    localSourceImage={this.props.localSourceImage}
                    permissionDialogTitle={this.props.permissionDialogTitle}
                    permissionDialogMessage={this.props.permissionDialogMessage}
                    mode={mode}
                    onAddTextShape={(pos, size) => {
                        this.setState({
                            isShowAddTextModal: true,
                            textConfig: { pos },
                        });
                    }}
                    onOperationsChange={this.props.onOperationsChange}
                />
                <View style={{ flexDirection: "row" }}>
                    <FlatList
                        data={this.props.strokeColors}
                        extraData={this.state}
                        keyExtractor={() => Math.ceil(Math.random() * 10000000).toString()}
                        renderItem={this._renderItem}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                    />
                </View>
                {this._renderSideBar()}
                <Modal
                    animationType="slide"
                    transparent={true}
                    visible={isShowAddTextModal}
                    onRequestClose={() => {
                        this.setState({
                            isShowAddTextModal: false,
                        });
                    }}
                >
                    <TouchableWithoutFeedback
                        onPress={() => {
                            this.setState({
                                isShowAddTextModal: false,
                                textContent: "",
                                textConfig: {},
                            });
                        }}
                    >
                        <View style={styles.centeredView}>
                            <View style={styles.modalView}>
                                <TextInput
                                    style={styles.modalText}
                                    placeholder="Input your text components"
                                    value={textContent}
                                    onChangeText={(text) => {
                                        this.setState({
                                            textContent: text,
                                        });
                                    }}
                                />
                                <Pressable
                                    style={[styles.button, styles.buttonClose]}
                                    onPress={() => {
                                        const operation = {
                                            id: uuid.v4(),
                                            userId: this.props.user,
                                            timestamp: Date.now(),
                                            data: {
                                                id: parseInt(Math.random() * 100000000),
                                                text: textContent,
                                                posCenter: textConfig.pos,
                                                scale: 0.8,
                                                rotate: 0.0,
                                                type: "text",
                                                size: 20,
                                                color: "#4a4a4a",
                                            },
                                        };
                                        this._sketchCanvas.addOperation(operation);
                                        this.setState({
                                            isShowAddTextModal: false,
                                            textContent: "",
                                            textConfig: {},
                                        });
                                    }}
                                >
                                    <Text style={styles.textStyle}>Add Text</Text>
                                </Pressable>
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                </Modal>
            </View>
        );
    }
}

RNSketchCanvas.MAIN_BUNDLE = ImageEditor.MAIN_BUNDLE;
RNSketchCanvas.DOCUMENT = ImageEditor.DOCUMENT;
RNSketchCanvas.LIBRARY = ImageEditor.LIBRARY;
RNSketchCanvas.CACHES = ImageEditor.CACHES;

const styles = StyleSheet.create({
    centeredView: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        marginTop: 22,
        backgroundColor: "rgba(0,0,0,0.5)",
    },
    modalView: {
        margin: 20,
        backgroundColor: "white",
        borderRadius: 20,
        padding: 35,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    button: {
        borderRadius: 20,
        padding: 10,
        elevation: 2,
    },
    buttonOpen: {
        backgroundColor: "#F194FF",
    },
    buttonClose: {
        backgroundColor: "#2196F3",
    },
    textStyle: {
        color: "white",
        fontWeight: "bold",
        textAlign: "center",
    },
    modalText: {
        marginBottom: 15,
        textAlign: "center",
    },
});

export default RNSketchCanvas;

export { ImageEditor };
