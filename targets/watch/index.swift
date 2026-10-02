import SwiftUI
import WatchKit

@main
struct watchEntry: App {
    init() { _ = TempoWatchModel.shared }

    var body: some Scene {
        WindowGroup {
            ContentView()
        }
        .backgroundTask(.watchConnectivity) { }
    }
}
