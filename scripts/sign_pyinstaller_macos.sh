#!/bin/bash
set -e

# --- DIE FUNCTION FOR CRITICAL ERRORS ---
die() {
    echo "❌ CRITICAL ERROR: $1"
    echo "🚨 BUILD STOPPED."
    exit 1
}

echo "🔐 Starting PyInstaller binaries signing..."

# Check required environment variables
if [ -z "$CSC_LINK" ] || [ -z "$CSC_KEY_PASSWORD" ]; then
    die "CSC_LINK and CSC_KEY_PASSWORD environment variables are required"
fi

if [ -z "$1" ]; then
    echo "Usage: $0 <path_to_pyinstaller_dist>"
    die "PyInstaller dist directory path is required as first argument"
fi

DIST_DIR="$1"
ENTITLEMENTS_PATH="${2:-electron/entitlements.mac.plist}"

if [ ! -d "$DIST_DIR" ]; then
    die "Directory not found: $DIST_DIR"
fi

echo "📁 Dist directory: $DIST_DIR"
echo "📄 Entitlements: $ENTITLEMENTS_PATH"

# Create temporary keychain
KEYCHAIN_PATH="$RUNNER_TEMP/build.keychain"
KEYCHAIN_PASSWORD=$(openssl rand -base64 32)

echo "🔑 Creating temporary keychain..."
security create-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN_PATH" || die "Failed to create keychain"
security set-keychain-settings -lut 21600 "$KEYCHAIN_PATH"
security unlock-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN_PATH"

# Decode and import certificate
echo "📜 Importing certificate..."
echo "$CSC_LINK" | base64 --decode > certificate.p12
security import certificate.p12 -k "$KEYCHAIN_PATH" -P "$CSC_KEY_PASSWORD" -T /usr/bin/codesign || die "Certificate import failed"
security set-key-partition-list -S apple-tool:,apple:,codesign: -s -k "$KEYCHAIN_PASSWORD" "$KEYCHAIN_PATH" || die "Partition-list error"
rm certificate.p12

# Get Identity and Team ID
# Look for Developer ID Application certificate
IDENTITY_FULL=$(security find-identity -v -p codesigning "$KEYCHAIN_PATH" | grep "Developer ID Application" | head -1)

if [ -z "$IDENTITY_FULL" ]; then
    echo "⚠️  Warning: 'Developer ID Application' certificate not found!"
    echo "    Trying to find any other available certificate..."
    IDENTITY_FULL=$(security find-identity -v -p codesigning "$KEYCHAIN_PATH" | head -1)
fi

# Extract clean Identity (for codesign) and Team ID (for verification)
IDENTITY=$(echo "$IDENTITY_FULL" | grep -o '".*"' | tr -d '"')
# Extract Team ID (usually in parentheses at the end, e.g. J2UX64RTK2)
EXPECTED_TEAM_ID=$(echo "$IDENTITY" | grep -o '([A-Z0-9]\{10\})' | tr -d '()')

if [ -z "$IDENTITY" ]; then
    die "No signing certificate found!"
fi

echo "✅ Using Identity: $IDENTITY"
echo "✅ Expected Team ID: ${EXPECTED_TEAM_ID:-Not determined}"

# Add keychain to search list
security list-keychains -d user -s "$KEYCHAIN_PATH" $(security list-keychains -d user | sed s/\"//g)

# Find _internal directory
INTERNAL_DIR=$(find "$DIST_DIR" -type d -name "_internal" | head -1)

if [ -z "$INTERNAL_DIR" ]; then
    echo "⚠️  _internal directory not found, skipping internal signing"
else
    echo "📦 Found _internal directory: $INTERNAL_DIR"
    
    # ---------------------------------------------------------
    # STAGE 1: Sign libraries
    # ---------------------------------------------------------
    echo "📚 Signing dynamic libraries..."
    find "$INTERNAL_DIR" -type f \( -name "*.dylib" -o -name "*.so" \) | while read -r lib; do
        codesign --sign "$IDENTITY" \
                 --force \
                 --keychain "$KEYCHAIN_PATH" \
                 --timestamp \
                 --options runtime \
                 "$lib" 2>/dev/null || echo "   ⚠ Warning: Could not sign $(basename "$lib")"
    done

    # ---------------------------------------------------------
    # STAGE 2: Sign Python.framework
    # ---------------------------------------------------------
    PYTHON_FRAMEWORK="$INTERNAL_DIR/Python.framework"
    if [ -d "$PYTHON_FRAMEWORK" ]; then
        echo "🐍 Processing Python.framework..."
        FRAMEWORK_BINARY=$(find "$PYTHON_FRAMEWORK" -type f -name "Python" | head -n 1)
        
        if [ -n "$FRAMEWORK_BINARY" ]; then
            echo "   🔨 Signing internal binary: $(basename "$FRAMEWORK_BINARY")"
            codesign --sign "$IDENTITY" \
                     --force \
                     --keychain "$KEYCHAIN_PATH" \
                     --timestamp \
                     --options runtime \
                     --entitlements "$ENTITLEMENTS_PATH" \
                     "$FRAMEWORK_BINARY" || die "Failed to sign Python binary inside framework!"
        else
            die "Python binary not found inside framework!"
        fi

        echo "   📦 Signing framework bundle..."
        codesign --sign "$IDENTITY" \
                 --force \
                 --keychain "$KEYCHAIN_PATH" \
                 --timestamp \
                 --options runtime \
                 "$PYTHON_FRAMEWORK" || die "Failed to sign Python.framework directory!"
    fi

    # ---------------------------------------------------------
    # STAGE 3: Sign executables
    # ---------------------------------------------------------
    echo "🔧 Signing executables..."
    STANDALONE_PYTHON="$INTERNAL_DIR/Python"
    if [ -f "$STANDALONE_PYTHON" ]; then
         codesign --sign "$IDENTITY" \
                 --force \
                 --keychain "$KEYCHAIN_PATH" \
                 --timestamp \
                 --options runtime \
                 --entitlements "$ENTITLEMENTS_PATH" \
                 "$STANDALONE_PYTHON" || die "Failed to sign standalone Python!"
         echo "   ✓ Signed standalone Python"
    fi

    find "$INTERNAL_DIR" -type f -perm +111 ! -name "*.dylib" ! -name "*.so" ! -path "*.framework/*" ! -name "Python" | while read -r exec; do
        codesign --sign "$IDENTITY" \
                 --force \
                 --keychain "$KEYCHAIN_PATH" \
                 --timestamp \
                 --options runtime \
                 --entitlements "$ENTITLEMENTS_PATH" \
                 "$exec" 2>/dev/null || echo "   ⚠ Could not sign $(basename "$exec")"
    done
fi

# ---------------------------------------------------------
# STAGE 4: Sign main executable
# ---------------------------------------------------------
MAIN_EXEC=$(find "$DIST_DIR" -maxdepth 1 -type f -perm +111 -name "pearl_*" | head -1)
if [ -n "$MAIN_EXEC" ]; then
    echo "🎯 Signing main executable..."
    codesign --sign "$IDENTITY" \
             --force \
             --keychain "$KEYCHAIN_PATH" \
             --timestamp \
             --options runtime \
             --entitlements "$ENTITLEMENTS_PATH" \
             "$MAIN_EXEC" || die "Failed to sign main executable!"
    echo "   ✓ Signed $(basename "$MAIN_EXEC")"
else
    die "Main executable (pearl_*) not found!"
fi

# ---------------------------------------------------------
# STAGE 5: VERIFICATION - ENHANCED
# ---------------------------------------------------------
echo "---------------------------------------------------"
echo "🔍 STARTING SIGNATURE VERIFICATION"
echo "---------------------------------------------------"

check_signature() {
    local file_path=$1
    if [ -e "$file_path" ]; then
        echo "🔎 Checking: $(basename "$file_path")"
        
        # 1. Validate with codesign --verify
        if codesign -v --strict "$file_path"; then
            echo "   ✅ Signature Valid"
        else
            echo "   ❌ INVALID SIGNATURE: $file_path"
            die "Signature validation failed for $file_path"
        fi
        
        # 2. Get detailed information (-dvvv)
        local info=$(codesign -d -vvv "$file_path" 2>&1)

        # 3. Check Hardened Runtime
        if echo "$info" | grep -q "Runtime Version"; then
            echo "   ✅ Hardened Runtime: OK"
        else
            echo "   ❌ Hardened Runtime: MISSING"
            die "Hardened Runtime missing in $file_path"
        fi

        # 4. Check Certificate TYPE and TEAM ID
        # Method A: Check via Designated Requirements (most reliable way to check OID)
        # OID 1.2.840.113635.100.6.1.13 = Developer ID Application
        local dr_info=$(codesign -d -r- "$file_path" 2>&1)
        
        if echo "$dr_info" | grep -q "1.2.840.113635.100.6.1.13"; then
             echo "   ✅ Cert Type: Developer ID Application (Verified via OID)"
        else
             # If OID not found, check text Authority field (fallback)
             local authority_line=$(echo "$info" | grep "Authority=" | head -n 1)
             if echo "$authority_line" | grep -q "Developer ID Application"; then
                 echo "   ✅ Cert Type: Developer ID Application (Verified via Authority Name)"
             else
                 echo "   ❌ Cert Type: WRONG OR UNKNOWN"
                 echo "      Requirements: $dr_info"
                 echo "      Authority: $authority_line"
                 die "Certificate is not 'Developer ID Application'. Notarization will fail."
             fi
        fi

        # 5. Check Team Identifier (if we know the expected one)
        if [ -n "$EXPECTED_TEAM_ID" ]; then
            local team_line=$(echo "$info" | grep "TeamIdentifier=$EXPECTED_TEAM_ID")
            if [ -n "$team_line" ]; then
                 echo "   ✅ Team ID: Match ($EXPECTED_TEAM_ID)"
            else
                 local found_team=$(echo "$info" | grep "TeamIdentifier=")
                 echo "   ❌ Team ID: MISMATCH"
                 echo "      Expected: $EXPECTED_TEAM_ID"
                 echo "      Found:    $found_team"
                 die "Application signed with wrong certificate!"
            fi
        fi
    fi
}

# Check internal Python
if [ -n "$FRAMEWORK_BINARY" ]; then
    check_signature "$FRAMEWORK_BINARY"
fi

# Check main file
if [ -n "$MAIN_EXEC" ]; then
    check_signature "$MAIN_EXEC"
fi

echo "---------------------------------------------------"

# Cleanup
echo "🧹 Cleaning up keychain..."
security delete-keychain "$KEYCHAIN_PATH" || true

echo "✅ Signing and verification process completed successfully!"
 