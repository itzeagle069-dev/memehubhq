import re

# Read the file
with open('src/app/page.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the indentation issues - find and replace the exact bad section
bad_section = '''            </div>
            );
}

            export default function Home() {
    return (
            <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin"></div></div>}>
                <HomeContent />
            </Suspense>
            );
}'''

good_section = '''        </div>
    );
}

export default function Home() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin"></div></div>}>
            <HomeContent />
        </Suspense>
    );
}'''

content = content.replace(bad_section, good_section)

# Write back
with open('src/app/page.js', 'w', encoding='utf-8', newline='') as f:
    f.write(content)

print("Fixed indentation!")
