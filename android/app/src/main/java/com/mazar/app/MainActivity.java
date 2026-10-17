package com.mazar.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.PowerManager;
import android.provider.Settings;
import android.webkit.JavascriptInterface;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    public static final String NOTIFICATION_CHANNEL_ID = "default_notification_channel";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Principle 3: Setup Notification Channel with IMPORTANCE_HIGH (Android 8.0+ / Android 13+)
        createDefaultNotificationChannel();

        // Principle 2: Setup Native Bridge for OEM Battery Management (Xiaomi, Huawei, Oppo, etc.)
        setupNativeBridge();
    }

    private void createDefaultNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (notificationManager != null) {
                NotificationChannel channel = new NotificationChannel(
                    NOTIFICATION_CHANNEL_ID,
                    "إشعارات مزار الفورية",
                    NotificationManager.IMPORTANCE_HIGH
                );
                channel.setDescription("قناة إشعارات المشاوير والطلبات الفورية لتطبيق مزار");
                channel.enableLights(true);
                channel.setLightColor(Color.parseColor("#E65100"));
                channel.enableVibration(true);
                channel.setVibrationPattern(new long[]{0, 250, 200, 250, 200, 500});
                channel.setShowBadge(true);
                channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);

                notificationManager.createNotificationChannel(channel);
            }
        }
    }

    private void setupNativeBridge() {
        if (this.bridge != null && this.bridge.getWebView() != null) {
            this.bridge.getWebView().addJavascriptInterface(new NativeOEMBridge(this), "NativeBridge");
        }
    }

    public static class NativeOEMBridge {
        private final Context context;

        public NativeOEMBridge(Context context) {
            this.context = context;
        }

        @JavascriptInterface
        public void requestIgnoreBatteryOptimizations() {
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    String packageName = context.getPackageName();
                    PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
                    if (pm != null && !pm.isIgnoringBatteryOptimizations(packageName)) {
                        Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                        intent.setData(Uri.parse("package:" + packageName));
                        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        context.startActivity(intent);
                        return;
                    }
                }
            } catch (Exception ignored) {}

            try {
                Intent fallback = new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
                fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(fallback);
            } catch (Exception ignored) {}
        }

        @JavascriptInterface
        public void openAutoStartSettings() {
            String[][] intents = {
                {"com.miui.securitycenter", "com.miui.permcenter.autostart.AutoStartManagementActivity"},
                {"com.letv.android.letvsafe", "com.letv.android.letvsafe.AutobootManageActivity"},
                {"com.huawei.systemmanager", "com.huawei.systemmanager.startupmgr.ui.StartupNormalAppListActivity"},
                {"com.huawei.systemmanager", "com.huawei.systemmanager.optimize.process.ProtectActivity"},
                {"com.coloros.safecenter", "com.coloros.safecenter.permission.startup.StartupAppListActivity"},
                {"com.oppo.safe", "com.oppo.safe.permission.startup.StartupAppListActivity"},
                {"com.iqoo.secure", "com.iqoo.secure.ui.phoneoptimize.AddWhiteListActivity"},
                {"com.vivo.permissionmanager", "com.vivo.permissionmanager.activity.BgStartUpManagerActivity"}
            };

            for (String[] pair : intents) {
                try {
                    Intent intent = new Intent();
                    intent.setComponent(new ComponentName(pair[0], pair[1]));
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    context.startActivity(intent);
                    return;
                } catch (Exception ignored) {}
            }

            try {
                Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                intent.setData(Uri.parse("package:" + context.getPackageName()));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(intent);
            } catch (Exception ignored) {}
        }

        @JavascriptInterface
        public void openBatterySaverSettings() {
            try {
                Intent intent = new Intent();
                intent.setComponent(new ComponentName("com.miui.powerkeeper", "com.miui.powerkeeper.ui.HiddenAppsConfigActivity"));
                intent.putExtra("package_name", context.getPackageName());
                intent.putExtra("package_label", "مزار");
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(intent);
            } catch (Exception e) {
                requestIgnoreBatteryOptimizations();
            }
        }
    }
}
