Pod::Spec.new do |s|
  s.name = 'RheoMesh'
  s.version = '0.1.0'
  s.summary = 'Rheo local data mesh transport'
  s.description = 'CoreBluetooth and local Wi-Fi replication of public Rheo records.'
  s.author = 'Rheo'
  s.homepage = 'https://github.com/iwanbrioc/rheo-alignment-lab'
  s.license = { :type => 'Unlicense', :file => '../vendor/BITCHAT-LICENSE' }
  s.platforms = { :ios => '16.4' }
  s.source = { :git => 'https://github.com/iwanbrioc/rheo-alignment-lab.git' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.frameworks = 'CoreBluetooth', 'MultipeerConnectivity', 'CryptoKit', 'Security'
  s.source_files = '**/*.{h,m,mm,swift}'
  s.swift_version = '5.9'
end
