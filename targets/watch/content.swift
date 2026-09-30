import SwiftUI
import WatchConnectivity

final class TempoWatchModel: NSObject, ObservableObject, WCSessionDelegate {
    @Published var status = "waiting"
    @Published var title = "Open Tempo on iPhone"
    @Published var site = "Your next shift will appear here"
    @Published var time = ""
    @Published var note = "Pair with your iPhone to sync"

    override init() {
        super.init()
        guard WCSession.isSupported() else { return }
        let session = WCSession.default
        session.delegate = self
        session.activate()
        apply(session.receivedApplicationContext)
    }

    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        if let error = error {
            DispatchQueue.main.async { self.note = error.localizedDescription }
        }
    }

    func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
        DispatchQueue.main.async { self.apply(applicationContext) }
    }

    private func apply(_ context: [String: Any]) {
        guard let newStatus = context["status"] as? String else { return }
        status = newStatus
        title = context["title"] as? String ?? "No shift scheduled"
        site = context["site"] as? String ?? ""
        time = context["time"] as? String ?? ""
        note = context["note"] as? String ?? ""
    }

    func requestScanner() {
        guard WCSession.isSupported(), WCSession.default.activationState == .activated else {
            note = "Open Tempo on your iPhone"
            return
        }
        WCSession.default.sendMessage(["action": "openScanner"], replyHandler: { reply in
            DispatchQueue.main.async {
                self.note = (reply["message"] as? String) ?? "Check your iPhone"
            }
        }, errorHandler: { _ in
            DispatchQueue.main.async { self.note = "Open Tempo on your iPhone" }
        })
    }
}

struct ContentView: View {
    @StateObject private var model = TempoWatchModel()
    private let mint = Color(red: 0.84, green: 0.89, blue: 0.80)

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                HStack(spacing: 6) {
                    HStack(spacing: 2) {
                        Capsule().frame(width: 4, height: 10)
                        Capsule().frame(width: 4, height: 18)
                        Capsule().frame(width: 4, height: 14)
                    }.rotationEffect(.degrees(-22))
                    Text("tempo").font(.system(size: 18, weight: .medium))
                }
                Spacer()
                Circle().fill(model.status == "onShift" || model.status == "onBreak" ? mint : .gray).frame(width: 7, height: 7)
            }
            Spacer(minLength: 2)
            Text(model.status == "onBreak" ? "ON PAID BREAK" : model.status == "onShift" ? "ON SHIFT" : model.status == "complete" ? "SHIFT COMPLETE" : model.status == "upcoming" ? "NEXT SHIFT" : "WORKER STATUS")
                .font(.system(size: 10, weight: .bold, design: .rounded))
                .tracking(1.2).foregroundStyle(mint)
            Text(model.time.isEmpty ? model.title : model.time)
                .font(.system(size: model.time.isEmpty ? 18 : 31, weight: .bold, design: .rounded))
                .minimumScaleFactor(0.7).lineLimit(2)
            if !model.time.isEmpty {
                Text(model.title).font(.system(size: 13, weight: .semibold)).lineLimit(1)
            }
            Text(model.site).font(.system(size: 11)).foregroundStyle(.secondary).lineLimit(1)
            Spacer(minLength: 2)
            Button(action: model.requestScanner) {
                Label("Scan on iPhone", systemImage: "qrcode.viewfinder")
                    .font(.system(size: 12, weight: .bold))
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .tint(mint)
            Text(model.note).font(.system(size: 9)).foregroundStyle(.secondary).lineLimit(2)
        }
        .padding(.horizontal, 9)
        .padding(.vertical, 5)
        .background(Color(red: 0.035, green: 0.075, blue: 0.055))
    }
}

#Preview {
    ContentView()
}
