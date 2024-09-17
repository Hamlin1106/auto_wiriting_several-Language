import keyboard
import time

time.sleep(5)

# Open the file with the correct encoding (UTF-8)
with open('data.js', 'r', encoding='utf-8') as file:
    lines = file.readlines()

# Iterate through the lines and type them one by one
for line in lines:
    for ch in line: 
        if keyboard.is_pressed('esc'):  # Check if the "Esc" key is pressed
            break  # Exit the loop if the Esc key is pressed
        keyboard.write(ch)
        time.sleep(0.5)
    keyboard.press('enter')