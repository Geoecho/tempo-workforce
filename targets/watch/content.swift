import SwiftUI
import WatchConnectivity
import WatchKit
import UserNotifications

final class TempoWatchModel: NSObject, ObservableObject, WCSessionDelegate, UNUserNotificationCenterDelegate {
    static let shared = TempoWatchModel()
    @Published var status = "waiting"
    @Published var title = "Open Tempo on iPhone"
    @Published var site = "Your next shift will appear here"
    @Published var time = ""
    @Published var note = "Open Tempo on your iPhone"
    @Published var linked = false
    @Published var running = false
    @Published var hasPay = false
    @Published var worked: Double = 0
    @Published var earnedCents: Double = 0
    @Published var rate: Double = 0
    @Published var currency = "USD"
    @Published var unit = "hour"
    @Published var qrSize = 0
    @Published var qrBits = ""
    @Published var sentAt = Date()

    override init() {
        super.init()
        UNUserNotificationCenter.current().delegate = self
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound]) { _, _ in }
        guard WCSession.isSupported() else { return }
        let session = WCSession.default
        session.delegate = self
        session.activate()
        apply(session.receivedApplicationContext)
    }

    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        DispatchQueue.main.async {
            if let error = error { self.note = error.localizedDescription; return }
            self.apply(session.receivedApplicationContext)
        }
    }

    func sessionReachabilityDidChange(_ session: WCSession) {
        DispatchQueue.main.async { self.linked = session.isReachable || self.status != "waiting" }
    }

    func session(_ session: WCSession, didReceiveUserInfo userInfo: [String : Any] = [:]) {
        DispatchQueue.main.async { self.apply(userInfo) }
    }

    func session(_ session: WCSession, didReceiveMessage message: [String : Any], replyHandler: @escaping ([String : Any]) -> Void) {
        DispatchQueue.main.async { self.apply(message) }
        replyHandler(["ok": true])
    }

    func session(_ session: WCSession, didReceiveMessage message: [String : Any]) {
        DispatchQueue.main.async { self.apply(message) }
    }

    func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
        DispatchQueue.main.async { self.apply(applicationContext) }
    }

    private func apply(_ context: [String: Any]) {
        guard let newStatus = context["status"] as? String else { return }
        linked = true
        status = newStatus
        title = context["title"] as? String ?? "No shift scheduled"
        site = context["site"] as? String ?? ""
        time = context["time"] as? String ?? ""
        note = context["note"] as? String ?? ""
        running = context["running"] as? Bool ?? false
        hasPay = context["has"] as? Bool ?? false
        worked = (context["worked"] as? NSNumber)?.doubleValue ?? 0
        earnedCents = (context["earned"] as? NSNumber)?.doubleValue ?? 0
        rate = (context["rate"] as? NSNumber)?.doubleValue ?? 0
        currency = context["currency"] as? String ?? "USD"
        unit = context["unit"] as? String ?? "hour"
        qrSize = (context["qrSize"] as? NSNumber)?.intValue ?? 0
        qrBits = context["qrBits"] as? String ?? ""
        handleEvent(context)
        if let ms = (context["at"] as? NSNumber)?.doubleValue { sentAt = Date(timeIntervalSince1970: ms / 1000) }
    }

    private var seenEvent: String {
        get { UserDefaults.standard.string(forKey: "tempo.lastEvent") ?? "" }
        set { UserDefaults.standard.set(newValue, forKey: "tempo.lastEvent") }
    }

    // Check-in / check-out from the iPhone: haptic now, plus a notification so it is felt when the app is not open.
    private func handleEvent(_ context: [String: Any]) {
        guard let event = context["event"] as? String, let id = context["eventId"] as? String, id != seenEvent else { return }
        seenEvent = id
        WKInterfaceDevice.current().play(event == "in" ? .start : .stop)
        let content = UNMutableNotificationContent()
        content.title = context["eventTitle"] as? String ?? (event == "in" ? "Checked in" : "Checked out")
        var body = context["eventBody"] as? String ?? ""
        if event == "out", (context["has"] as? Bool ?? false), let cents = (context["earned"] as? NSNumber)?.doubleValue {
            let f = NumberFormatter()
            f.numberStyle = .currency
            f.currencyCode = context["currency"] as? String ?? "USD"
            let money = f.string(from: NSNumber(value: cents / 100)) ?? ""
            body += body.isEmpty ? "Earned \(money)" : " · Earned \(money)"
        }
        content.body = body
        content.sound = .default
        let request = UNNotificationRequest(identifier: "tempo-\(id)", content: content, trigger: UNTimeIntervalNotificationTrigger(timeInterval: 1, repeats: false))
        UNUserNotificationCenter.current().add(request)
    }

    func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification, withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        completionHandler([.banner, .sound])
    }

    func requestScanner() {
        WKInterfaceDevice.current().play(.click)
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
    @ObservedObject private var model = TempoWatchModel.shared
    private let mint = Color(red: 0.84, green: 0.89, blue: 0.80)
    private let darkGreen = Color(red: 0.09, green: 0.42, blue: 0.29)
    private let moneyGreen = Color(red: 0.42, green: 0.88, blue: 0.58)
    private let bg = Color(red: 0.035, green: 0.075, blue: 0.055)
    private var k: CGFloat { min(1.2, max(0.8, WKInterfaceDevice.current().screenBounds.width / 184)) }

    private func money(_ cents: Double) -> String {
        let f = NumberFormatter()
        f.numberStyle = .currency
        f.currencyCode = model.currency
        return f.string(from: NSNumber(value: cents / 100)) ?? ""
    }

    private func clock(_ seconds: Double) -> String {
        let t = Int(max(0, seconds))
        return String(format: "%d:%02d:%02d", t / 3600, (t % 3600) / 60, t % 60)
    }

    private func hm(_ seconds: Double) -> String {
        let t = Int(max(0, seconds)) / 60
        return "\(t / 60)h \(String(format: "%02d", t % 60))m"
    }

    private func big(_ text: String, _ size: CGFloat, _ color: Color = .white) -> some View {
        Text(text)
            .font(.system(size: size * k, weight: .bold, design: .rounded))
            .monospacedDigit()
            .foregroundStyle(color)
            .minimumScaleFactor(0.5).lineLimit(1)
    }

    private func caption(_ text: String) -> some View {
        Text(text)
            .font(.system(size: 11 * k, weight: .bold, design: .rounded))
            .tracking(1.2).foregroundStyle(mint)
    }

    private func small(_ text: String, _ size: CGFloat = 13) -> some View {
        Text(text).font(.system(size: size * k, weight: .semibold)).lineLimit(2).minimumScaleFactor(0.7)
    }

    private func dim(_ text: String) -> some View {
        Text(text).font(.system(size: 12 * k)).foregroundStyle(.secondary).lineLimit(2)
    }

    private var live: Bool { model.status == "onShift" || model.status == "onBreak" }

    // Page 1: the glance
    @ViewBuilder private var glance: some View {
        switch model.status {
        case "onShift", "onBreak":
            TimelineView(.periodic(from: .now, by: 1)) { ctx in
                let delta = model.running ? max(0, ctx.date.timeIntervalSince(model.sentAt)) : 0
                let payDelta = model.unit == "hour" ? delta : 0
                VStack(alignment: .leading, spacing: 2 * k) {
                    caption(model.status == "onBreak" ? "PAID BREAK" : "ON SHIFT")
                    big(clock(model.worked + delta), 44)
                    if model.hasPay { big(money(model.earnedCents + payDelta * model.rate / 36), 32, moneyGreen) }
                }
            }
        case "complete":
            VStack(alignment: .leading, spacing: 2 * k) {
                caption("DONE TODAY")
                big(hm(model.worked), 40)
                if model.hasPay { big(money(model.earnedCents), 32, moneyGreen) }
            }
        case "upcoming":
            VStack(alignment: .leading, spacing: 2 * k) {
                caption("NEXT SHIFT")
                big(model.time.isEmpty ? "—" : model.time, 54)
                small(model.title, 15)
            }
        default:
            VStack(alignment: .leading, spacing: 2 * k) {
                caption(model.linked ? "TEMPO" : "WAITING FOR IPHONE")
                big(model.linked ? "No shifts" : "Open Tempo", 28)
            }
        }
    }

    private var pageGlance: some View {
        VStack(alignment: .leading, spacing: 6 * k) {
            Spacer(minLength: 0)
            glance.frame(maxWidth: .infinity, alignment: .leading)
            Spacer(minLength: 0)
            Button(action: model.requestScanner) {
                Label("Scan", systemImage: "qrcode.viewfinder")
                    .font(.system(size: 14 * k, weight: .bold))
                    .frame(maxWidth: .infinity, minHeight: 28 * k)
            }
            .buttonStyle(.borderedProminent)
            .tint(darkGreen)
            .foregroundStyle(.white)
        }
    }

    // Page 2: shift details
    private var pageShift: some View {
        VStack(alignment: .leading, spacing: 4 * k) {
            Spacer(minLength: 0)
            caption("SHIFT")
            big(model.title, 24)
            if !model.site.isEmpty { dim(model.site) }
            if !model.note.isEmpty { small(model.note, 14) }
            Spacer(minLength: 0)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    // Page 3: pay details
    private var pagePay: some View {
        VStack(alignment: .leading, spacing: 4 * k) {
            Spacer(minLength: 0)
            caption("PAY")
            if model.hasPay {
                big(money(model.earnedCents), 36, moneyGreen)
                dim("Worked " + hm(model.worked))
            } else {
                big("—", 36, moneyGreen)
                dim("Starts when you check in")
            }
            if model.rate > 0 { small(money(model.rate * 100) + " / " + model.unit, 14) }
            Spacer(minLength: 0)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    // Page 4: personal ID code, scanned by a manager
    private var pageCode: some View {
        VStack(spacing: 4 * k) {
            Spacer(minLength: 0)
            if model.qrSize > 0 && model.qrBits.count == model.qrSize * model.qrSize {
                let n = model.qrSize
                let bits = Array(model.qrBits)
                Canvas { ctx, size in
                    let cell = min(size.width, size.height) / CGFloat(n)
                    for row in 0..<n {
                        for col in 0..<n where bits[row * n + col] == "1" {
                            ctx.fill(Path(CGRect(x: CGFloat(col) * cell, y: CGFloat(row) * cell, width: cell + 0.5, height: cell + 0.5)), with: .color(.black))
                        }
                    }
                }
                .aspectRatio(1, contentMode: .fit)
                .padding(7)
                .background(Color.white)
                .clipShape(RoundedRectangle(cornerRadius: 8))
                .frame(maxWidth: 128 * k, maxHeight: 128 * k)
                caption("MY ID CODE")
            } else {
                caption("MY ID CODE")
                dim("Sign in as a worker on the iPhone")
            }
            Spacer(minLength: 0)
        }
        .frame(maxWidth: .infinity)
    }

    var body: some View {
        VStack(spacing: 2 * k) {
            HStack {
                HStack(spacing: 2) {
                    Capsule().frame(width: 4 * k, height: 10 * k)
                    Capsule().frame(width: 4 * k, height: 18 * k)
                    Capsule().frame(width: 4 * k, height: 14 * k)
                }.rotationEffect(.degrees(-22)).foregroundStyle(mint)
                Spacer()
                Circle().fill(model.linked ? mint : .gray).frame(width: 7 * k, height: 7 * k)
            }
            .padding(.horizontal, 10)
            TabView {
                pageGlance.padding(.horizontal, 10)
                pageShift.padding(.horizontal, 10)
                pagePay.padding(.horizontal, 10)
                pageCode.padding(.horizontal, 10)
            }
            .tabViewStyle(.page)
        }
        .padding(.top, 4)
        .background(bg)
    }
}

#Preview {
    ContentView()
}
