import React, { memo, useState, useEffect } from "react";
import PropTypes from "prop-types";
import {
  Card,
  CardContent,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  Button,
  IconButton,
  Chip,
  Avatar,
  Tooltip,
  Zoom,
  Fade,
} from "@mui/material";
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Info as InfoIcon,
  Category as CategoryIcon,
  Close as CloseIcon,
  MoreVert as MoreVertIcon,
  Visibility as ViewIcon,
} from "@mui/icons-material";

const CategoryCard = memo(
  ({
    category,
    onEdit,
    onCategoryDelete = () => {},
    onSubcategoryDelete = () => {},
    onSubcategoryEdit = () => {},
    disableActions = false,
  }) => {
    const [isInfoOpen, setIsInfoOpen] = useState(false);
    const [showActions, setShowActions] = useState(false);
    const [selectedSubcategory, setSelectedSubcategory] = useState(null);
    const [isSubcategoryDetailOpen, setIsSubcategoryDetailOpen] =
      useState(false);

    useEffect(() => {
      const handleClickOutside = (event) => {
        if (showActions && !event.target.closest(".actions-container")) {
          setShowActions(false);
        }
      };

      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }, [showActions]);

    if (!category) return null;

    return (
      <>
        <Card className="relative h-72 overflow-hidden transition-all duration-300 hover:shadow-xl rounded-xl">
          {/* Background Image/Icon */}
          <div className="absolute inset-0">
            {category.image?.url ? (
              <img
                src={category.image.url}
                alt={category.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-blue-600 flex items-center justify-center">
                <CategoryIcon sx={{ fontSize: 96, color: "white" }} />
              </div>
            )}
          </div>

          {/* Content */}
          <CardContent className="relative h-full z-10 flex flex-col p-6">
            {/* Header */}
            <div className="flex justify-between items-start">
              <Typography
                variant="h5"
                className="text-white font-bold tracking-wide flex-1 mr-4"
                sx={{ textShadow: "2px 2px 4px rgba(0,0,0,0.3)" }}
              >
                {category.name}
              </Typography>
              <Chip
                label={`${category.totalStock || 0} Products`}
                className="bg-green-500 text-white shadow-md"
                size="small"
              />
            </div>

            {/* Actions */}
            <div className="mt-auto flex flex-wrap items-center gap-2">
              <Button
                onClick={() => setIsInfoOpen(true)}
                className="bg-blue-500 hover:bg-blue-600 text-white shadow-md"
                startIcon={<InfoIcon />}
                size="small"
                disabled={disableActions}
              >
                View Info
              </Button>

              <div className="ml-auto relative actions-container">
                <IconButton
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowActions(!showActions);
                  }}
                  className="bg-white hover:bg-gray-100 shadow-md"
                  size="small"
                  disabled={disableActions}
                >
                  <MoreVertIcon />
                </IconButton>

                <Fade in={showActions}>
                  <div className="absolute right-0 bottom-full mb-2 flex flex-col gap-2 bg-white p-2 rounded-lg shadow-lg z-50">
                    <Zoom
                      in={showActions}
                      style={{ transitionDelay: showActions ? "100ms" : "0ms" }}
                    >
                      <Button
                        onClick={() => {
                          onEdit();
                          setShowActions(false);
                        }}
                        className="bg-amber-500 hover:bg-amber-600 text-white normal-case"
                        startIcon={<EditIcon />}
                        size="small"
                        fullWidth
                      >
                        Edit
                      </Button>
                    </Zoom>
                    <Zoom
                      in={showActions}
                      style={{ transitionDelay: showActions ? "150ms" : "0ms" }}
                    >
                      <Button
                        onClick={() => {
                          onCategoryDelete(category); // Pass the entire category object
                          setShowActions(false);
                        }}
                        className="bg-red-500 hover:bg-red-600 text-white normal-case"
                        startIcon={<DeleteIcon />}
                        size="small"
                        fullWidth
                      >
                        Delete 
                      </Button>
                    </Zoom>
                  </div>
                </Fade>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Category Info Dialog */}
        <Dialog
          open={isInfoOpen}
          onClose={() => setIsInfoOpen(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{
            className: "rounded-xl",
          }}
        >
          <DialogTitle className="flex justify-between items-center border-b p-4">
            <div className="flex items-center gap-3">
              <Avatar
                src={category.image?.url}
                className="w-12 h-12 border-2 border-gray-200"
              >
                <CategoryIcon />
              </Avatar>
              <div>
                <Typography variant="h6" className="font-semibold">
                  {category.name}
                </Typography>
                <Typography variant="body2" className="text-gray-600">
                  Category Information
                </Typography>
              </div>
            </div>
            <IconButton onClick={() => setIsInfoOpen(false)}>
              <CloseIcon />
            </IconButton>
          </DialogTitle>

          <DialogContent className="p-6">
            <div className="flex gap-6">
              {/* Left side - Category Details */}
              <div className="flex-1 border-r pr-6">
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <Typography
                      variant="subtitle2"
                      className="text-gray-600 mb-1"
                    >
                      Total Products
                    </Typography>
                    <Typography variant="h6">
                      {category.totalStock || 0}
                    </Typography>
                  </div>
                  <div>
                    <Typography
                      variant="subtitle2"
                      className="text-gray-600 mb-1"
                    >
                      Subcategories
                    </Typography>
                    <Typography variant="h6">
                      {category.subcategories?.length || 0}
                    </Typography>
                  </div>
                </div>

                {category.description && (
                  <div className="mb-6">
                    <Typography
                      variant="subtitle2"
                      className="text-gray-600 mb-1"
                    >
                      Description
                    </Typography>
                    <Typography>{category.description}</Typography>
                  </div>
                )}

                {category.image?.url && (
                  <div>
                    <Typography
                      variant="subtitle2"
                      className="text-gray-600 mb-1"
                    >
                      Category Image
                    </Typography>
                    <img
                      src={category.image.url}
                      alt={category.name}
                      className="w-full h-40 object-cover rounded-lg mt-2"
                    />
                  </div>
                )}
              </div>

              {/* Right side - Subcategories */}
              <div className="flex-1 pl-6">
                <Typography variant="subtitle2" className="text-gray-600 mb-2">
                  Subcategories List
                </Typography>
                {category.subcategories?.length > 0 ? (
                  <div className="space-y-2">
                    {category.subcategories.map((subcategory) => (
                      <div
                        key={subcategory._id}
                        className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 group transition-colors"
                      >
                        <Avatar
                          src={subcategory.image?.url}
                          className="w-8 h-8"
                        >
                          <CategoryIcon className="text-gray-400" />
                        </Avatar>
                        <Typography className="flex-1 font-medium">
                          {subcategory.name}
                        </Typography>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Tooltip title="View Details">
                            <IconButton
                              size="small"
                              className="text-blue-600"
                              onClick={() => {
                                setSelectedSubcategory(subcategory);
                                setIsSubcategoryDetailOpen(true);
                              }}
                            >
                              <ViewIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit">
                            <IconButton
                              size="small"
                              className="text-amber-500"
                              onClick={() => onSubcategoryEdit(subcategory)}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton
                              size="small"
                              className="text-red-500"
                              onClick={() => onSubcategoryDelete(subcategory)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Typography className="text-gray-500 italic">
                    No subcategories found
                  </Typography>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Subcategory Detail Dialog */}
        <Dialog
          open={isSubcategoryDetailOpen}
          onClose={() => setIsSubcategoryDetailOpen(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            className: "rounded-xl",
          }}
        >
          {selectedSubcategory && (
            <>
              <DialogTitle className="flex justify-between items-center border-b p-4">
                <div className="flex items-center gap-3">
                  <Avatar
                    src={selectedSubcategory.image?.url}
                    className="w-10 h-10"
                  >
                    <CategoryIcon />
                  </Avatar>
                  <div>
                    <Typography variant="h6" className="font-semibold">
                      {selectedSubcategory.name}
                    </Typography>
                    <Typography variant="body2" className="text-gray-600">
                      Subcategory Details
                    </Typography>
                  </div>
                </div>
                <IconButton onClick={() => setIsSubcategoryDetailOpen(false)}>
                  <CloseIcon />
                </IconButton>
              </DialogTitle>
              <DialogContent className="p-6">
                {selectedSubcategory.description && (
                  <Typography className="mt-2 mb-4">
                    {selectedSubcategory.description}
                  </Typography>
                )}
                {selectedSubcategory.image?.url && (
                  <img
                    src={selectedSubcategory.image.url}
                    alt={selectedSubcategory.name}
                    className="w-full h-48 object-cover rounded-lg mt-4"
                  />
                )}
              </DialogContent>
            </>
          )}
        </Dialog>
      </>
    );
  }
);

CategoryCard.propTypes = {
  category: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    description: PropTypes.string,
    image: PropTypes.shape({
      url: PropTypes.string,
    }),
    totalStock: PropTypes.number,
    subcategories: PropTypes.arrayOf(
      PropTypes.shape({
        _id: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        description: PropTypes.string,
        image: PropTypes.shape({
          url: PropTypes.string,
        }),
      })
    ),
  }).isRequired,
  onEdit: PropTypes.func.isRequired,
  onCategoryDelete: PropTypes.func.isRequired,
  onSubcategoryDelete: PropTypes.func,
  onSubcategoryEdit: PropTypes.func,
  disableActions: PropTypes.bool,
};

CategoryCard.displayName = "CategoryCard";

export default CategoryCard;