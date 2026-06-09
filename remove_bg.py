from PIL import Image

img_path = r'D:/Workspace/Mandalagiri/web/public/img/Mandalagiri.png'
img = Image.open(img_path).convert('RGBA')
datas = img.getdata()

newData = []
for item in datas:
    # If the pixel is very dark, make it transparent
    if item[0] < 40 and item[1] < 40 and item[2] < 40:
        newData.append((0, 0, 0, 0))
    else:
        newData.append(item)

img.putdata(newData)
img.save(img_path, 'PNG')
