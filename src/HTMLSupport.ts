/**
 * Utility for creation and manipulation of HTML elements.
 */
export class HTMLSupport {

  /**
   * Creates an SVG element with the given name.
   * @param name the name of the SVG element
   * @param attrs attributes of the element, optional
   */
  public static createElement(name: string, attrs?: any): HTMLElement {
    const result = document.createElement(name);
    if (attrs) {
      this.setAttributes(result, attrs);
    }
    return result as HTMLElement;
  }

  /**
   * Removes the given element from its parent.
   * @param element the element to remove
   */
  public static removeElement(element: HTMLElement): void {
    if (element.parentElement) {
      element.parentElement.removeChild(element);
    }
  }

  /**
   * Deletes all children for the given element.
   * @param element the element whose children to delete
   */
  public static removeChildren(element: HTMLElement): void {
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
  }

  /**
   * Sets attributes for the given HTML element
   * @param element the element to set the attributes on
   * @param attrs the attributes to set
   */
  public static setAttributes(element: HTMLElement, attrs: any): void {
    for (const v in attrs) {
      if (attrs.hasOwnProperty(v)) {
        element.setAttribute(v, attrs[v]);
      }
    }
  }

  /**
   * Sets style attributes for the given HTML element
   * @param element the element to set the style attributes on
   * @param attrs the attributes to set
   */
  public static setStyleAttributes(element: HTMLElement, attrs: any): void {
    for (const v in attrs) {
      if (attrs.hasOwnProperty(v)) {
        element.style[v] = attrs[v];
      }
    }
  }

}
