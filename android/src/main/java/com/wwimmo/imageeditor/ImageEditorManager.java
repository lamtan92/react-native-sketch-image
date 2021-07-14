package com.wwimmo.imageeditor;

import android.app.Activity;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.ActivityInfo;
import android.content.res.Configuration;
import android.util.Log;
import android.graphics.Color;

import com.facebook.common.logging.FLog;
import com.facebook.react.bridge.Callback;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.common.ReactConstants;
import com.facebook.react.common.MapBuilder;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.facebook.react.uimanager.SimpleViewManager;
import com.facebook.react.uimanager.ThemedReactContext;
import com.facebook.react.uimanager.annotations.ReactProp;

import java.util.HashMap;
import java.util.Map;
import java.util.ArrayList;
import android.graphics.PointF;

import javax.annotation.Nullable;

import com.wwimmo.imageeditor.utils.entities.EntityType;

public class ImageEditorManager extends SimpleViewManager<ImageEditor> {
    public static final int COMMAND_ADD_POINT = 1;
    public static final int COMMAND_NEW_PATH = 2;
    public static final int COMMAND_CLEAR = 3;
    public static final int COMMAND_ADD_PATH = 4;
    public static final int COMMAND_DELETE_PATH = 5;
    public static final int COMMAND_SAVE = 6;
    public static final int COMMAND_END_PATH = 7;
    public static final int COMMAND_DELETE_SELECTED_SHAPE = 8;
    public static final int COMMAND_ADD_SHAPE = 9;
    public static final int COMMAND_INCREASE_SHAPE_FONTSIZE = 10;
    public static final int COMMAND_DECREASE_SHAPE_FONTSIZE = 11;
    public static final int COMMAND_CHANGE_SHAPE_TEXT = 12;
    public static final int COMMAND_UNSELECT_SHAPE = 13;
    public static final int COMMAND_DELETE_SHAPE = 14;

    public static ImageEditor Canvas = null;

    private static final String PROPS_LOCAL_SOURCE_IMAGE = "localSourceImage";
    private static final String PROPS_TEXT = "text";
    private static final String PROPS_SHAPE_CONFIGURATION = "shapeConfiguration";
    private static final String PROPS_GESTURES_ENABLED = "gesturesEnabled";
    private static final String PROPS_USER = "user";

    @Override
    public String getName() {
        return "RNImageEditor";
    }

    @Override
    protected ImageEditor createViewInstance(ThemedReactContext context) {
        ImageEditorManager.Canvas = new ImageEditor(context);
        return ImageEditorManager.Canvas;
    }

    @ReactProp(name = PROPS_SHAPE_CONFIGURATION)
    public void setShapeConfiguration(ImageEditor viewContainer, ReadableMap shapeConfiguration) {
        if (shapeConfiguration != null) {
            viewContainer.setShapeConfiguration(shapeConfiguration);
        }
    }

    @ReactProp(name = PROPS_LOCAL_SOURCE_IMAGE)
    public void setLocalSourceImage(ImageEditor viewContainer, ReadableMap localSourceImage) {
        if (localSourceImage != null && localSourceImage.getString("filename") != null) {
            viewContainer.openImageFile(
                localSourceImage.hasKey("filename") ? localSourceImage.getString("filename") : null,
                localSourceImage.hasKey("directory") ? localSourceImage.getString("directory") : "",
                localSourceImage.hasKey("mode") ? localSourceImage.getString("mode") : ""
            );
        }
    }

    @ReactProp(name = PROPS_TEXT)
    public void setText(ImageEditor viewContainer, ReadableArray text) {
        viewContainer.setCanvasText(text);
    }

    @ReactProp(name = PROPS_GESTURES_ENABLED)
    public void setGesturesEnabled(ImageEditor viewContainer, boolean enabled){
        viewContainer.setGesturesEnabled(enabled);
    }

    @ReactProp(name = PROPS_USER)
    public void setUser(ImageEditor viewContainer, String user){
        viewContainer.setUser(user);
    }

    @Override
    public Map<String,Integer> getCommandsMap() {
        Map<String, Integer> map = new HashMap<>();

        map.put("addPoint", COMMAND_ADD_POINT);
        map.put("newPath", COMMAND_NEW_PATH);
        map.put("clear", COMMAND_CLEAR);
        map.put("addPath", COMMAND_ADD_PATH);
        map.put("deletePath", COMMAND_DELETE_PATH);
        map.put("save", COMMAND_SAVE);
        map.put("endPath", COMMAND_END_PATH);
        map.put("deleteSelectedShape", COMMAND_DELETE_SELECTED_SHAPE);
        map.put("addShape", COMMAND_ADD_SHAPE);
        map.put("increaseShapeFontsize", COMMAND_INCREASE_SHAPE_FONTSIZE);
        map.put("decreaseShapeFontsize", COMMAND_DECREASE_SHAPE_FONTSIZE);
        map.put("changeShapeText", COMMAND_CHANGE_SHAPE_TEXT);
        map.put("unselectShape", COMMAND_UNSELECT_SHAPE);
        map.put("deleteShape", COMMAND_DELETE_SHAPE);

        return map;
    }

    @Override
    protected void addEventEmitters(ThemedReactContext reactContext, ImageEditor view) {

    }

    @Override
    public void receiveCommand(ImageEditor view, int commandType, @Nullable ReadableArray args) {
        switch (commandType) {
            case COMMAND_ADD_POINT: {
                view.addPoint((float)args.getDouble(0), (float)args.getDouble(1), (boolean)args.getBoolean(2));
                return;
            }
            case COMMAND_NEW_PATH: {
                view.newPath(args.getInt(0), args.getInt(1), (float)args.getDouble(2));
                return;
            }
            case COMMAND_CLEAR: {
                view.clear();
                return;
            }
            case COMMAND_ADD_PATH: {
                ReadableArray path = args.getArray(3);
                ArrayList<PointF> pointPath = new ArrayList<PointF>(path.size());
                for (int i=0; i<path.size(); i++) {
                    String[] coor = path.getString(i).split(",");
                    pointPath.add(new PointF(Float.parseFloat(coor[0]), Float.parseFloat(coor[1])));
                }
                view.addPath(args.getInt(0), args.getInt(1), (float)args.getDouble(2), pointPath);
                return;
            }
            case COMMAND_DELETE_PATH: {
                view.deletePath(args.getInt(0));
                return;
            }
            case COMMAND_SAVE: {
                view.save(args.getString(0), args.getString(1), args.getString(2), args.getBoolean(3), args.getBoolean(4), args.getBoolean(5), args.getBoolean(6));
                return;
            }
            case COMMAND_END_PATH: {
                view.end();
                return;
            }
            case COMMAND_DELETE_SELECTED_SHAPE: {
                view.releaseSelectedEntity();
                return;
            }
            case COMMAND_ADD_SHAPE: {
                EntityType shapeType = null;
                switch(args.getString(0)) {
                    case "Circle":
                        shapeType = EntityType.CIRCLE;
                        break;
                    case "Rect":
                        shapeType = EntityType.RECT;
                        break;
                    case "Square":
                        shapeType = EntityType.SQUARE;
                        break;
                    case "Triangle":
                        shapeType = EntityType.TRIANGLE;
                        break;
                    case "Arrow":
                        shapeType = EntityType.ARROW;
                        break;
                    case "Text":
                        shapeType = EntityType.TEXT;
                        break;
                    case "Image":
                        shapeType = EntityType.IMAGE;
                        break;
                    default:
                        shapeType = EntityType.CIRCLE;
                        break;
                }

                String typeFace = args.isNull(1) ? null : args.getString(1);
                int fontSize = args.getInt(2);
                String text = args.isNull(3) ? null : args.getString(3);
                String imagePath = args.isNull(4) ? null : args.getString(4);
                String userId = args.getString(5);
                int id = args.getInt(6);
                String points = args.isNull(7) ? null : args.getString(7);
                float scale = (float)args.getDouble(8);
                float rotate = (float)args.getDouble(9);
                int color = args.getInt(10);

                if (points != null) {
                    String[] coor = points.split(",");
                    view.addEntity(shapeType, typeFace, fontSize, text, imagePath, userId, id, Float.parseFloat(coor[0]), Float.parseFloat(coor[1]), scale, rotate, color);
                } else {
                    view.addEntity(shapeType, typeFace, fontSize, text, imagePath, "", id, 0.0f, 0.0f, 0.8f, 0.0f, Color.BLACK);
                }
                return;
            }
            case COMMAND_INCREASE_SHAPE_FONTSIZE: {
                view.increaseTextEntityFontSize();
                return;
            }
            case COMMAND_DECREASE_SHAPE_FONTSIZE: {
                view.decreaseTextEntityFontSize();
                return;
            }
            case COMMAND_CHANGE_SHAPE_TEXT: {
                String newText = args.getString(0);
                view.setTextEntityText(newText);
                return;
            }
            case COMMAND_UNSELECT_SHAPE: {
                view.unselectShape();
                return;
            }
            case COMMAND_DELETE_SHAPE: {
                view.deleteShape(args.getInt(0));
                return;
            }
            default:
                throw new IllegalArgumentException(String.format(
                        "Unsupported command %d received by %s.",
                        commandType,
                        getClass().getSimpleName()));
        }
    }
}
