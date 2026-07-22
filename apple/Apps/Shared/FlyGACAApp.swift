import FeatureUI
import SwiftUI

// The ENTIRE app shell, shared source-for-source by every target in the family
// (PPL, ELPT, AIP, …). Which app this binary is comes from build configuration,
// not code: each target's xcconfig pins FG_MODULE_ID (surfaced in Info.plist as
// FGModuleID) plus its bundle id, display name, icon and Content folder.
// Adding a new App Store app must never require editing this file.
@main
struct FlyGACAApp: App {
    private let moduleID = Bundle.main.object(forInfoDictionaryKey: "FGModuleID") as? String

    var body: some Scene {
        WindowGroup {
            SingleModuleRootView(moduleID: moduleID)
        }
    }
}
