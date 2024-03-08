ALPHABET = [
    "Alfa",
    "Bravo",
    "Charlie",
    "Delta",
    "Echo",
    "Foxtrot",
    "Golf",
    "Hotel",
    "India",
    "Juliett",
    "Kilo",
    "Lima",
    "Mike",
    "November",
    "Oscar",
    "Papa",
    "Quebec",
    "Romeo",
    "Sierra",
    "Tango",
    "Uniform",
    "Victor",
    "Whiskey",
    "Xray",
    "Yankee",
    "Zulu"
]

NUMBERS = [
    "Zero",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Niner"
]

def phoneticize(data: str, sep: str = ""):
    data = data.lower()
    output = []
    for char in data:
        try:
            output.append(NUMBERS[int(char)])
        except ValueError:
            output.append(ALPHABET[ord(char) - ord("a")])
    return sep.join(output)
