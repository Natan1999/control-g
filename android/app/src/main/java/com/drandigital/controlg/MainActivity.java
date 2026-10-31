package com.drandigital.controlg;

import android.os.Bundle;
import android.os.Build;
import android.view.View;
import android.webkit.WebView;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.WebViewListener;

public class MainActivity extends BridgeActivity {
    private static final String LOGIN_PATH = "/login";
    private static final String CLEAR_STALE_WEB_SHELL =
        "(() => {" +
        "const marker='cg_native_shell_2_2_1';" +
        "if(sessionStorage.getItem(marker)) return;" +
        "sessionStorage.setItem(marker,'1');" +
        "const unregister=('serviceWorker' in navigator)" +
        "?navigator.serviceWorker.getRegistrations().then(items=>Promise.all(items.map(item=>item.unregister())))" +
        ":Promise.resolve();" +
        "const clearCaches=('caches' in window)" +
        "?caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('workbox-')||key.startsWith('control-g-')).map(key=>caches.delete(key))))" +
        ":Promise.resolve();" +
        "Promise.all([unregister,clearCaches]).finally(()=>window.location.replace('/login'));" +
        "})();";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (bridge == null) return;

        // Android 15+ enforces edge-to-edge for current Play targets. Keep
        // login, capture controls and bottom navigation outside system bars,
        // display cutouts and the keyboard, including landscape/tablet mode.
        if (Build.VERSION.SDK_INT >= 35) {
            View content = findViewById(android.R.id.content);
            ViewCompat.setOnApplyWindowInsetsListener(content, (view, windowInsets) -> {
                Insets bars = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
                Insets keyboard = windowInsets.getInsets(WindowInsetsCompat.Type.ime());
                view.setPadding(bars.left, bars.top, bars.right, Math.max(bars.bottom, keyboard.bottom));
                return WindowInsetsCompat.CONSUMED;
            });
            content.post(() -> ViewCompat.requestApplyInsets(content));
        }

        bridge.addWebViewListener(new WebViewListener() {
            @Override
            public void onPageLoaded(WebView webView) {
                webView.evaluateJavascript(CLEAR_STALE_WEB_SHELL, null);
            }
        });

        // Native enforcement: Android always loads the login route directly.
        // Authenticated users are redirected from there to their role dashboard.
        bridge.getWebView().loadUrl(bridge.getLocalUrl() + LOGIN_PATH);
    }
}
