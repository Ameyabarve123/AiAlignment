# filter_test.py
video_list = [48]
input_file = r"C:\Users\barvea\Downloads\CholecSeg8k\CholecSeg8k\splits\test.txt"
output_file = r"C:\Users\barvea\Documents\GitHub\Jeccoman\AiAlignment\data-splitter\test_filtered.txt"

with open(input_file, "r") as f:
    lines = f.readlines()

filtered_lines = []
for line in lines:
    line = line.strip()
    if not line:
        continue
    prefix = line.split("_")[0]
    try:
        video_num = int(prefix.replace("video", ""))
        if video_num in video_list:
            filtered_lines.append(line)
    except:
        continue

with open(output_file, "w") as f:
    f.write("\n".join(filtered_lines))

print(f"Filtered {len(filtered_lines)} lines written to {output_file}")