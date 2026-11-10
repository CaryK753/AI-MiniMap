// Created by wwj.
import Cocoa
import SafariServices
import SwiftUI
import WebKit

private let extensionIdentifier = "com.wwj.conversationminimap.Extension"

class ViewController: NSViewController {
    @IBOutlet weak var webView: WKWebView?

    override func viewDidLoad() {
        super.viewDidLoad()
        preferredContentSize = NSSize(width: 560, height: 480)
        view = NSHostingView(rootView: WelcomeView())
    }

    override func viewDidAppear() {
        super.viewDidAppear()
        view.window?.contentMinSize = NSSize(width: 500, height: 440)
        view.window?.setContentSize(NSSize(width: 560, height: 480))
        view.window?.center()
    }
}

private struct WelcomeView: View {
    @State private var enabled: Bool?
    @State private var failed = false
    private var chinese: Bool { Locale.preferredLanguages.first?.hasPrefix("zh") == true }
    private func text(_ zh: String, _ en: String) -> String { chinese ? zh : en }

    private var card: some View {
        VStack(spacing: 18) {
            Image(systemName: "text.alignleft")
                .font(.system(size: 34, weight: .light))
                .accessibilityHidden(true)
            Text("Conversation Minimap").font(.title2.weight(.semibold))
            Text(text("在 ChatGPT、Gemini 与 Claude 中轻松回到每一条提示词。", "Find your way through ChatGPT, Gemini and Claude conversations."))
                .multilineTextAlignment(.center).foregroundStyle(.secondary)
            Label(
                enabled == true ? text("Safari 扩展已启用", "Safari extension is enabled") : text("在 Safari 设置中启用扩展", "Enable the extension in Safari Settings"),
                systemImage: enabled == true ? "checkmark.circle" : "puzzlepiece.extension"
            ).font(.callout)
            if failed {
                Text(text("暂时无法打开扩展设置。请手动打开 Safari → 设置 → 扩展。", "Could not open extension settings. Open Safari → Settings → Extensions."))
                    .font(.caption).foregroundStyle(.secondary).multilineTextAlignment(.center)
            }
            if #available(macOS 26.0, *) {
                Button(action: openSettings) { Text(text("打开 Safari 设置", "Open Safari Settings")) }
                    .buttonStyle(.glassProminent).controlSize(.large)
            } else {
                Button(action: openSettings) { Text(text("打开 Safari 设置", "Open Safari Settings")) }
                    .buttonStyle(.borderedProminent).controlSize(.large)
            }
        }.padding(30).frame(maxWidth: 380)
    }

    var body: some View {
        VStack(spacing: 20) {
            if #available(macOS 26.0, *) {
                card.glassEffect(.regular, in: .rect(cornerRadius: 26))
            } else {
                card.background(.regularMaterial, in: RoundedRectangle(cornerRadius: 26))
            }
            Text(text("网页内可设置语言与亮暗主题；默认跟随设备。", "Language and appearance are available in the webpage panel. Defaults follow your device."))
                .font(.caption).foregroundStyle(.secondary).multilineTextAlignment(.center)
        }
        .padding(28)
        .frame(minWidth: 500, maxWidth: .infinity, minHeight: 440, maxHeight: .infinity)
        .onAppear {
            SFSafariExtensionManager.getStateOfSafariExtension(withIdentifier: extensionIdentifier) { state, _ in
                DispatchQueue.main.async { enabled = state?.isEnabled }
            }
        }
    }

    private func openSettings() {
        SFSafariApplication.showPreferencesForExtension(withIdentifier: extensionIdentifier) { error in
            DispatchQueue.main.async { failed = error != nil }
        }
    }
}
