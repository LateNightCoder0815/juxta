from os import walk, makedirs
import logging
import shutil
from PIL import Image
from subprocess import Popen, PIPE

pic_folder = "pictures"
thumbs_folder = "thumbs"
pic_types = ["jpg", "jpeg", "png"]
vid_types = ["mp4", "mov"]
images_dat = open("images.dat", "w")
vid_overlay = Image.open("play.png")

shutil.rmtree(thumbs_folder, ignore_errors=True)

for (dirpath, dirnames, filenames) in walk(pic_folder):
    dirnames.sort()
    for file in filenames:
        file_type = file.split(".")[1]
        file_type = file_type.lower()
        if file_type in pic_types:
            # Write images_dat
            img_output_path = dirpath + '/' + file
        elif file_type in vid_types:
            # Create thumbnail
            current_thumbs_folder = dirpath.replace(
                "pictures", thumbs_folder, 1)
            makedirs(current_thumbs_folder, exist_ok=True)
            video_input_path = dirpath + '/' + file
            img_output_path = current_thumbs_folder + '/' + file + '.jpg'
            p = Popen(['ffmpeg', '-i', video_input_path, '-ss',
                       '00:00:00.000', '-vframes', '1', img_output_path],
                      stdin=PIPE, stdout=PIPE, stderr=PIPE)
            output, err = p.communicate()
            if p.returncode:
                logging.warning(video_input_path +
                                ' skipping file error: ' + str(err))
                continue
            # Add play icon
            thumb = Image.open(img_output_path)
            # Scale overlay
            size_factor = max(thumb.size[0]/1920, thumb.size[0]/1080)
            vid_overlay_scaled = vid_overlay.resize(
                (int(vid_overlay.size[0] * size_factor),
                 int(vid_overlay.size[0] * size_factor)))
            # Center icon
            x = int(thumb.size[0] / 2 - vid_overlay_scaled.size[0] / 2)
            y = int(thumb.size[1] / 2 - vid_overlay_scaled.size[1] / 2)
            thumb.paste(vid_overlay_scaled, (x, y), mask=vid_overlay_scaled)
            thumb.save(img_output_path, 'jpeg')
        else:
            logging.warning(dirpath + file +
                            " not within the allowed types: " +
                            str(pic_types + vid_types) + " so skipping ...")
            continue

        # Write images_dat
        meta = "|" + " - ".join(dirpath.split("/")[1:])         # header
        meta += "§" + file                                      # footer
        images_dat.write(img_output_path + meta + '\n')

images_dat.close()
