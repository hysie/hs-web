module.exports = {
  async redirects() {
    return [
      {
        source: '/editor',
        destination: '/editor/index.html',
        permanent: true
      }
    ]
  }
}
