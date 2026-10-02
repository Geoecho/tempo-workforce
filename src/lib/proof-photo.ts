import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

// Take a photo (camera, falling back to the library) and shrink it for local storage.
export async function takeProofPhoto(): Promise<string | null> {
  let result: ImagePicker.ImagePickerResult | null = null;
  try {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (perm.granted) result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 });
  } catch { result = null; }
  if (!result) result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
  if (result.canceled || !result.assets?.[0]) return null;
  const context = ImageManipulator.manipulate(result.assets[0].uri);
  context.resize({ width: 640 });
  const image = await (await context.renderAsync()).saveAsync({ format: SaveFormat.JPEG, compress: .5, base64: true });
  if (!image.base64) throw new Error('Could not read that photo.');
  return `data:image/jpeg;base64,${image.base64}`;
}
