import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import ImageComparison from '../components/ImageComparison';
import { apiService, ComparisonResponse } from '../services/api';

const TechContainer = styled.div`
  min-height: 100vh;
  background: #0a0e27;
  color: #e1e5f2;
  font-family: 'Courier New', monospace;
  line-height: 1.6;
`;

const Header = styled.header`
  background: linear-gradient(135deg, #1a1d3a, #2d3561);
  border-bottom: 2px solid #0070f3;
  padding: 15px 0;
  position: sticky;
  top: 0;
  z-index: 100;
`;

const HeaderContent = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const Logo = styled(Link)`
  font-size: 1.5rem;
  font-weight: bold;
  color: #0070f3;
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 10px;
  
  &::before {
    content: '>';
    color: #0070f3;
  }
`;

const BackButton = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: transparent;
  color: #00ff88;
  padding: 8px 16px;
  border: 1px solid #00ff88;
  border-radius: 4px;
  text-decoration: none;
  font-family: 'Courier New', monospace;
  transition: all 0.3s ease;

  &:hover {
    background: #00ff88;
    color: #0a0e27;
  }
  
  &::before {
    content: '← ';
  }
`;

const MainContent = styled.main`
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 30px;
  
  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

const Sidebar = styled.aside<{ $isCollapsed: boolean }>`
  background: #1a1d3a;
  border: 1px solid #333;
  border-radius: 8px;
  padding: ${props => props.$isCollapsed ? '15px 10px' : '20px'};
  height: fit-content;
  position: sticky;
  top: 90px;
  max-height: calc(100vh - 120px);
  overflow-y: auto;
  width: ${props => props.$isCollapsed ? '60px' : '300px'};
  transition: all 0.3s ease;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, #7928ca, #ff0080);
  }
  
  @media (max-width: 1024px) {
    display: none;
  }
`;

const SidebarToggle = styled.button`
  background: transparent;
  border: 1px solid #333;
  color: #7928ca;
  padding: 8px;
  border-radius: 4px;
  cursor: pointer;
  margin-bottom: 15px;
  width: 100%;
  font-family: 'Courier New', monospace;
  transition: all 0.3s ease;
  
  &:hover {
    border-color: #7928ca;
    background: #0f1419;
  }
`;

const SidebarHeader = styled.h3<{ $isCollapsed: boolean }>`
  color: #7928ca;
  font-size: 1.1rem;
  margin-bottom: 15px;
  font-weight: normal;
  display: ${props => props.$isCollapsed ? 'none' : 'block'};
  
  &::before {
    content: '# ';
    color: #666;
  }
`;

const ImageTabsList = styled.div<{ $isCollapsed: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 10px;
  opacity: ${props => props.$isCollapsed ? 0 : 1};
  transition: opacity 0.3s ease;
`;

const ImageTab = styled.div<{ $isActive?: boolean; $isCollapsed: boolean }>`
  background: ${props => props.$isActive ? '#0f1419' : '#0a0e27'};
  border: 1px solid ${props => props.$isActive ? '#00ff88' : '#333'};
  border-radius: 4px;
  padding: ${props => props.$isCollapsed ? '8px' : '12px'};
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  
  &:hover {
    border-color: #0070f3;
    background: #0f1419;
  }
`;

const ImageThumbnailPair = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
`;

const ImageThumbnail = styled.img`
  width: 40px;
  height: 40px;
  object-fit: cover;
  border-radius: 3px;
  border: 1px solid #333;
`;

const TabInfo = styled.div<{ $isCollapsed: boolean }>`
  display: ${props => props.$isCollapsed ? 'none' : 'block'};
`;

const TabScore = styled.div`
  color: #00ff88;
  font-size: 0.9rem;
  font-weight: bold;
  margin-bottom: 3px;
`;

const TabNames = styled.div`
  color: #e1e5f2;
  font-size: 0.7rem;
  opacity: 0.8;
  line-height: 1.2;
`;

const CollapsedIndicator = styled.div<{ $isCollapsed: boolean }>`
  display: ${props => props.$isCollapsed ? 'flex' : 'none'};
  flex-direction: column;
  align-items: center;
  gap: 5px;
  padding: 5px 0;
`;

const TabNumber = styled.div`
  color: #7928ca;
  font-size: 0.8rem;
  font-weight: bold;
`;

const ContentArea = styled.div`
  min-width: 0; // Allows content to shrink
`;

const PageHeader = styled.div`
  background: #1a1d3a;
  border: 1px solid #333;
  border-radius: 8px;
  padding: 30px;
  margin-bottom: 30px;
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, #0070f3, #7928ca);
  }
`;

const PageTitle = styled.h1`
  color: #0070f3;
  margin-bottom: 10px;
  font-size: 2rem;
  font-weight: normal;
  
  &::before {
    content: '$ ';
    color: #666;
  }
`;

const PageDescription = styled.p`
  color: #8892b0;
  margin-bottom: 20px;
  font-size: 1.1rem;
`;

const StatusGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 15px;
  margin-top: 20px;
`;

const StatusItem = styled.div`
  background: #0f1419;
  border: 1px solid #333;
  border-radius: 4px;
  padding: 15px;
  text-align: center;
`;

const StatusValue = styled.div`
  color: #00ff88;
  font-size: 1.2rem;
  font-weight: bold;
  margin-bottom: 5px;
`;

const StatusLabel = styled.div`
  color: #8892b0;
  font-size: 0.8rem;
  text-transform: uppercase;
`;

const TechInfoGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 30px;
  margin-bottom: 30px;
  
  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

const InfoSection = styled.section`
  background: #1a1d3a;
  border: 1px solid #333;
  border-radius: 8px;
  padding: 25px;
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, #00ff88, #0070f3);
  }
`;

const InfoHeader = styled.h3`
  color: #00ff88;
  font-size: 1.2rem;
  margin-bottom: 15px;
  font-weight: normal;
  
  &::before {
    content: '// ';
    color: #666;
  }
`;

const InfoList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;

const InfoItem = styled.li`
  padding: 6px 0;
  color: #e1e5f2;
  
  &::before {
    content: '→ ';
    color: #0070f3;
    font-weight: bold;
  }
`;

const CodeSnippet = styled.pre`
  background: #0f1419;
  border: 1px solid #333;
  border-radius: 4px;
  padding: 15px;
  overflow-x: auto;
  font-size: 0.85rem;
  color: #e1e5f2;
  margin: 15px 0;
`;

const ToolSection = styled.div`
  background: #1a1d3a;
  border: 1px solid #333;
  border-radius: 8px;
  padding: 30px;
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, #7928ca, #ff0080);
  }
`;

const ToolHeader = styled.h2`
  color: #7928ca;
  font-size: 1.5rem;
  margin-bottom: 20px;
  font-weight: normal;
  
  &::before {
    content: '>>> ';
    color: #666;
  }
`;

interface ImageTab {
  id: string;
  difference_score: number;
  image_info: {
    image1_name?: string;
    image2_name?: string;
  };
  created_at: string;
  status: string;
  image1_data?: string; // Base64 image data for thumbnail
  image2_data?: string; // Base64 image data for thumbnail
}

const Tech: React.FC = () => {
  const [imageTabs, setImageTabs] = useState<ImageTab[]>([]);
  const [selectedTab, setSelectedTab] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [currentImages, setCurrentImages] = useState<{
    image1?: string;
    image2?: string;
    image1Name?: string;
    image2Name?: string;
  }>({});

  const handleNewComparison = (image1: File, image2: File, image1Name?: string, image2Name?: string) => {
    // Convert images to base64 for thumbnails
    const reader1 = new FileReader();
    const reader2 = new FileReader();
    
    reader1.onload = (e) => {
      const image1Data = e.target?.result as string;
      setCurrentImages(prev => ({ 
        ...prev, 
        image1: image1Data, 
        image1Name: image1Name || image1.name 
      }));
    };
    
    reader2.onload = (e) => {
      const image2Data = e.target?.result as string;
      setCurrentImages(prev => ({ 
        ...prev, 
        image2: image2Data, 
        image2Name: image2Name || image2.name 
      }));
    };
    
    reader1.readAsDataURL(image1);
    reader2.readAsDataURL(image2);
  };

  const handleComparisonComplete = (newComparison: ComparisonResponse) => {
    // Create new image tab with thumbnails
    const newTab: ImageTab = {
      id: newComparison.id,
      difference_score: newComparison.difference_score,
      image_info: newComparison.image_info,
      created_at: newComparison.created_at,
      status: newComparison.status,
      image1_data: currentImages.image1,
      image2_data: currentImages.image2
    };
    
    setImageTabs(prev => [newTab, ...prev.slice(0, 9)]); // Keep only last 10 tabs
    setSelectedTab(newComparison.id);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <TechContainer>
      <Header>
        <HeaderContent>
          <Logo to="/home">DukuAI</Logo>
          <BackButton to="/home">Back</BackButton>
        </HeaderContent>
      </Header>

      <MainContent>
        <Sidebar $isCollapsed={isCollapsed}>
          <SidebarToggle onClick={() => setIsCollapsed(!isCollapsed)}>
            {isCollapsed ? '→' : '←'}
          </SidebarToggle>
          
          <SidebarHeader $isCollapsed={isCollapsed}>Image Tabs</SidebarHeader>
          
          {imageTabs.length === 0 ? (
            !isCollapsed && (
              <div style={{ color: '#8892b0', textAlign: 'center', padding: '20px', fontSize: '0.9rem' }}>
                Start comparing images to see tabs here
              </div>
            )
          ) : (
            <ImageTabsList $isCollapsed={isCollapsed}>
              {imageTabs.map((tab, index) => (
                <ImageTab
                  key={tab.id}
                  $isActive={selectedTab === tab.id}
                  $isCollapsed={isCollapsed}
                  onClick={() => setSelectedTab(tab.id)}
                >
                  {isCollapsed ? (
                    <CollapsedIndicator $isCollapsed={isCollapsed}>
                      <TabNumber>{index + 1}</TabNumber>
                      <div style={{ 
                        width: '8px', 
                        height: '8px', 
                        borderRadius: '50%', 
                        backgroundColor: tab.difference_score > 50 ? '#ff6b6b' : '#00ff88' 
                      }} />
                    </CollapsedIndicator>
                  ) : (
                    <>
                      {tab.image1_data && tab.image2_data && (
                        <ImageThumbnailPair>
                          <ImageThumbnail src={tab.image1_data} alt="Before" />
                          <ImageThumbnail src={tab.image2_data} alt="After" />
                        </ImageThumbnailPair>
                      )}
                      <TabInfo $isCollapsed={isCollapsed}>
                        <TabScore>{tab.difference_score.toFixed(1)}% diff</TabScore>
                        <TabNames>
                          {tab.image_info.image1_name || 'Before'} vs {tab.image_info.image2_name || 'After'}
                        </TabNames>
                      </TabInfo>
                    </>
                  )}
                </ImageTab>
              ))}
            </ImageTabsList>
          )}
        </Sidebar>

        <ContentArea>
          <ToolSection>
            <ToolHeader>Interactive Comparison Engine</ToolHeader>
            <ImageComparison 
              onComparisonComplete={handleComparisonComplete}
              onImagesSelected={handleNewComparison}
            />
          </ToolSection>



          <TechInfoGrid>
            <InfoSection>
              <InfoHeader>Algorithm Configuration</InfoHeader>
              <CodeSnippet>{`# Processing Pipeline
1. Format validation & conversion
2. Size normalization (max 2048px)
3. RGB color space standardization
4. Multi-algorithm analysis:
   - SSIM (Structural Similarity)
   - MSE (Mean Squared Error)
   - Pixel difference detection`}</CodeSnippet>
              <InfoList>
                <InfoItem>Automatic preprocessing pipeline</InfoItem>
                <InfoItem>Weighted scoring algorithm</InfoItem>
                <InfoItem>Configurable sensitivity thresholds</InfoItem>
              </InfoList>
            </InfoSection>

            <InfoSection>
              <InfoHeader>Output Specifications</InfoHeader>
              <CodeSnippet>{`# Generated Visualizations
- Heatmap: Color-coded intensity mapping
- Overlay: Red highlights on changes
- Binary mask: Threshold-based detection
- Base64 PNG encoding for web display`}</CodeSnippet>
              <InfoList>
                <InfoItem>Difference score: 0-100% range</InfoItem>
                <InfoItem>Processing time tracking</InfoItem>
                <InfoItem>Detailed metrics export</InfoItem>
              </InfoList>
            </InfoSection>

            <InfoSection>
              <InfoHeader>Performance Metrics</InfoHeader>
              <InfoList>
                <InfoItem>Small images (100x100px): ~50-150ms</InfoItem>
                <InfoItem>Medium images (500x500px): ~200-500ms</InfoItem>
                <InfoItem>Large images (1920x1080px): ~800-2000ms</InfoItem>
                <InfoItem>Memory usage: ~5-20MB per comparison</InfoItem>
              </InfoList>
            </InfoSection>

            <InfoSection>
              <InfoHeader>Supported Formats</InfoHeader>
              <CodeSnippet>{`# Input Validation
- image/jpeg
- image/png  
- image/bmp
- image/tiff
- image/webp`}</CodeSnippet>
              <InfoList>
                <InfoItem>Automatic format detection</InfoItem>
                <InfoItem>Corruption validation</InfoItem>
                <InfoItem>Size limit enforcement</InfoItem>
              </InfoList>
            </InfoSection>
          </TechInfoGrid>
        </ContentArea>
      </MainContent>
    </TechContainer>
  );
};

export default Tech;
