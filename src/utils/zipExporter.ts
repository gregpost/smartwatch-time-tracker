import JSZip from 'jszip';
import { ANDROID_PROJECT_FILES } from '../data/androidProjectFiles';
import { GRADLE_WRAPPER_JAR_BASE64 } from '../data/gradleWrapperJarBase64';

export async function exportAndroidProjectZip(): Promise<void> {
  const zip = new JSZip();

  // Root project folder name
  const folder = zip.folder('GalaxyWatch-BezelTracker-Java');
  if (!folder) return;

  // Add all project files
  ANDROID_PROJECT_FILES.forEach(file => {
    const isExecutable = file.path.endsWith('.sh') || file.path === 'gradlew';
    folder.file(file.path, file.content, isExecutable ? { unixPermissions: '755' } : undefined);
  });

  // Add standard .gitignore
  folder.file('.gitignore', `*.iml
.gradle
/local.properties
/.idea/caches
/.idea/libraries
/.idea/modules.xml
/.idea/workspace.xml
/.idea/navEditor.xml
/.idea/assetWizardSettings.xml
.DS_Store
/build
/captures
.externalNativeBuild
.cxx
local.properties
`);

  // Add gradle-wrapper.properties
  folder.file('gradle/wrapper/gradle-wrapper.properties', `distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
distributionUrl=https\\://services.gradle.org/distributions/gradle-8.7-bin.zip
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists
`);

  // Add real binary gradle-wrapper.jar so gradlew works immediately out of the box
  folder.file('gradle/wrapper/gradle-wrapper.jar', GRADLE_WRAPPER_JAR_BASE64, { base64: true });

  // Generate blob and trigger download
  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'GalaxyWatch-BezelTracker-Java.zip';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
