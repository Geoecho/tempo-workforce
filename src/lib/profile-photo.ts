import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

export async function chooseProfilePhoto(): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 1 });
  if (result.canceled || !result.assets?.[0]) return null;
  const asset = result.assets[0];
  const context = ImageManipulator.manipulate(asset.uri);
  if (asset.width > 0 && asset.height > 0) {
    const side = Math.min(asset.width, asset.height);
    context.crop({ originX: Math.floor((asset.width - side) / 2), originY: Math.floor((asset.height - side) / 2), width: side, height: side });
  }
  context.resize({ width: 160, height: 160 });
  const image = await (await context.renderAsync()).saveAsync({ format: SaveFormat.JPEG, compress: .55, base64: true });
  if (!image.base64 || image.base64.length > 60_000) throw new Error('This photo is too large. Choose a different photo.');
  return `data:image/jpeg;base64,${image.base64}`;
}
