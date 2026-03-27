import qrcode
import os

def create_qr(url, filename):
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=4,
    )
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#2C3E50", back_color="#F9F9F7")
    
    filepath = os.path.join('qrcodes', filename)
    img.save(filepath)
    print(f"Generated QR code for {url} -> {filepath}")

if __name__ == "__main__":
    if not os.path.exists('qrcodes'):
        os.makedirs('qrcodes')
        
    base_url = "https://felipeycami.cl/fotos"
    
    # General QA
    create_qr(base_url, "qr_general_fotos.png")
    
    # Specific QA (Invites)
    create_qr(f"{base_url}?guest=prueba-felipe-cami", "qr_felipe_cami.png")
    create_qr(f"{base_url}?guest=familia-gonzalez", "qr_familia_gonzalez.png")
