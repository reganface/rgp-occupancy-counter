module.exports = {
  "transpileDependencies": [
    "vuetify"
  ],
  pluginOptions: {
    electronBuilder: {
      builderOptions: {
        appId: "ChrisRegan.RGPOccupancyCounter",
        productName: "RGP Occupancy Counter",
        win: {
          target: "nsis",
          publisherName: "Chris Regan"
        },
        nsis: {
          oneClick: false,
          artifactName: "${productName} Setup.${ext}"
        }
      }
    }
  }
}
